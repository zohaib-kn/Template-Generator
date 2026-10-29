import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { fetchRemoteImage, isBlockedAddress, parseImageUrl, safeLookup, sniffImageType, MAX_IMAGE_BYTES } from "@/lib/net/safeImageFetch";

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);

describe("SSRF-hardened image fetch", () => {
  it("blocks loopback, private, link-local, CGNAT, metadata and mapped IPv6 addresses", () => {
    for (const ip of [
      "127.0.0.1", "127.0.0.2", "0.0.0.0", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254",
      "100.64.0.1", "::1", "::", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::a9fe:a9fe",
    ]) {
      assert.equal(isBlockedAddress(ip), true, `${ip} must be blocked`);
    }
    for (const ip of ["93.184.216.34", "8.8.8.8", "2606:4700:4700::1111"]) {
      assert.equal(isBlockedAddress(ip), false, `${ip} should be allowed`);
    }
  });

  it("rejects bypass-style URLs before any network access", () => {
    for (const url of [
      "http://[::1]/x.png",
      "http://127.0.0.2/x.png",
      "http://0.0.0.0/x.png",
      "http://localhost/x.png",
      "http://metadata.google.internal/x",
      "http://user:pass@example.com/x.png",
      "http://example.com:8080/x.png",
      "file:///etc/passwd",
      "gopher://example.com/",
    ]) {
      assert.throws(() => parseImageUrl(url), `${url} must be rejected`);
    }
    assert.equal(parseImageUrl("https://bucket.s3.amazonaws.com/photo.jpg").hostname, "bucket.s3.amazonaws.com");
  });

  it("only accepts allow-listed raster images by magic bytes (no SVG/HTML)", () => {
    assert.equal(sniffImageType(PNG), "image/png");
    assert.equal(sniffImageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script/></svg>")), null);
    assert.equal(sniffImageType(Buffer.from("<html><script>alert(1)</script></html>")), null);
  });

  describe("against a local server", () => {
    let server: http.Server;
    let base: string;
    before(async () => {
      server = http.createServer((req, res) => {
        if (req.url === "/redirect") {
          res.writeHead(302, { Location: "http://169.254.169.254/" }).end();
        } else {
          res.writeHead(200, { "Content-Type": "image/png" }).end(PNG);
        }
      });
      await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });
    after(() => server.close());

    it("refuses to connect to a loopback server even on a resolvable name", async () => {
      await assert.rejects(fetchRemoteImage(`${base}/img.png`), /forbidden|ports/i);
    });
  });

  it("connect-time DNS lookup rejects names that resolve to loopback (rebinding-safe)", async () => {
    const err = await new Promise<Error | null>((resolve) =>
      safeLookup("localhost", {}, (e) => resolve(e as Error | null))
    );
    assert.ok(err, "localhost resolution must be rejected at connect time");
    assert.match(err!.message, /forbidden/i);
  });

  it("caps image size at 5 MB", () => {
    assert.equal(MAX_IMAGE_BYTES, 5 * 1024 * 1024);
  });
});
