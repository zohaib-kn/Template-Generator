import { memo, useState } from "react";
import type { LeadershipActivity } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";
import { LeadershipInlineForm } from "../components/EuropassSectionEditors";

interface LeadershipSectionProps {
  entries?: LeadershipActivity[];
  title?: string;
  isInteractive?: boolean;
  onAdd?: (entry: Omit<LeadershipActivity, "id">) => void;
  onUpdate?: (id: string, patch: Partial<LeadershipActivity>) => void;
  onRemove?: (id: string) => void;
  onDeleteSection?: () => void;
}

export const LeadershipSection = memo(function LeadershipSection({
  entries = [],
  title,
  isInteractive = false,
  onAdd,
  onUpdate,
  onRemove,
  onDeleteSection,
}: LeadershipSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter((e) => e.activity || e.description);
  if (visible.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle
          title={title || "LEADERSHIP & EXTRACURRICULAR"}
          isInteractive={isInteractive}
          onAddEntry={onAdd ? () => setIsAdding(true) : undefined}
          addLabel="Add Leadership & Extracurricular entry"
          onDeleteSection={onDeleteSection}
        />
      )}

      {/* Inline entry editor for adding new leadership item */}
      {isInteractive && isAdding && onAdd && (
        <LeadershipInlineForm
          onSave={(data) => {
            onAdd(data);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {visible.map((item) => (
          <div key={item.id} className={styles.educationEntry}>

            {isInteractive && onUpdate ? (
              <EditableText
                value={item.activity ?? ""}
                onChange={(v) => onUpdate(item.id, { activity: v })}
                isInteractive={isInteractive}
                className={styles.qualificationTitle}
                placeholder="Role / Activity Name"
                as="h3"
              />
            ) : (
              item.activity && (
                <h3 className={styles.qualificationTitle}>{item.activity}</h3>
              )
            )}

            {(isInteractive || item.organisation || item.duration) && (
              <div className={styles.institutionRow}>
                {isInteractive && onUpdate ? (
                  <EditableText
                    value={item.organisation ?? ""}
                    onChange={(v) => onUpdate(item.id, { organisation: v })}
                    isInteractive={isInteractive}
                    className={styles.institutionName}
                    placeholder="Organisation / Club"
                  />
                ) : (
                  item.organisation && (
                    <span className={styles.institutionName}>
                      {item.organisation}
                    </span>
                  )
                )}
                {(isInteractive || item.duration) && (
                  <span
                    className={styles.datesBadge}
                    data-html2canvas-ignore={!item.duration?.trim() ? "true" : undefined}
                    data-pdf-ignore={!item.duration?.trim() ? "true" : undefined}
                  >
                    [{" "}
                    {isInteractive && onUpdate ? (
                      <EditableText
                        value={item.duration ?? ""}
                        onChange={(v) => onUpdate(item.id, { duration: v })}
                        isInteractive={isInteractive}
                        placeholder="Duration"
                      />
                    ) : (
                      item.duration
                    )}{" "}
                    ]
                  </span>
                )}
              </div>
            )}

            {isInteractive && onUpdate ? (
              <EditableText
                value={item.description ?? ""}
                onChange={(v) => onUpdate(item.id, { description: v })}
                isInteractive={isInteractive}
                multiline
                className={styles.educationDetails}
                placeholder="Responsibilities and key contributions..."
              />
            ) : (
              item.description && (
                <div className={styles.educationDetails}>{item.description}</div>
              )
            )}

            {(isInteractive || item.impact) && (
              <div className={styles.entryImpactRow}>
                {isInteractive && onUpdate ? (
                  <EditableText
                    value={item.impact ?? ""}
                    onChange={(v) => onUpdate(item.id, { impact: v })}
                    isInteractive={isInteractive}
                    placeholder="Key impact or measurable achievement..."
                  />
                ) : (
                  item.impact
                )}
              </div>
            )}
          </div>
        ))}
    </section>
  );
});
