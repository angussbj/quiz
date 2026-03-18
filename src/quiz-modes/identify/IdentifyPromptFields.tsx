import styles from './IdentifyPromptFields.module.css';

export interface PromptField {
  readonly type: 'text' | 'flag';
  readonly value: string;
}

interface IdentifyPromptFieldsProps {
  readonly fields: ReadonlyArray<PromptField>;
}

export function IdentifyPromptFields({ fields }: IdentifyPromptFieldsProps) {
  if (fields.length === 0) return null;

  return (
    <div className={styles.fields}>
      {fields.map((field, index) => {
        if (field.type === 'flag') {
          return (
            <img
              key={index}
              src={`/flags/${field.value}.svg`}
              alt=""
              role="img"
              className={styles.flagImage}
            />
          );
        }
        return (
          <span key={index} className={styles.textField}>
            {field.value}
          </span>
        );
      })}
    </div>
  );
}
