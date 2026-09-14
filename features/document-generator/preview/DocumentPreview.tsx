"use client";

import { useDocumentContext } from "../state/DocumentContext";
import { PreviewScaler } from "./PreviewScaler";
import { EuropassTemplate } from "@/templates/europass/EuropassTemplate";

/**
 * Live A4 preview panel.
 * Reads DocumentData from context and passes it to the template component.
 * The template knows nothing about context — data flows only via props.
 */
export function DocumentPreview() {
  const { data } = useDocumentContext();

  return (
    <div className="w-full flex justify-center pb-8">
      <PreviewScaler contentWidth={794}>
        <EuropassTemplate data={data} />
      </PreviewScaler>
    </div>
  );
}
