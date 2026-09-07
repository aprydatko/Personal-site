import styles from './BlogHeroCodeWindow.module.css';

type BlogHeroCodeWindowProps = {
  code: string;
  fileName: string;
};

const splitCodeLine = (line: string) => {
  const match = line.match(/^(.*?\S)\s{2,}(.+)$/);
  return match ? { path: match[1], description: match[2] } : { path: line, description: undefined };
};

export const BlogHeroCodeWindow = ({ code, fileName }: BlogHeroCodeWindowProps) => (
  <section className={styles.window} aria-label={`${fileName} project structure`}>
    <header className={styles.header}>
      <span className={styles.controls} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className={styles.fileName}>{fileName}</span>
    </header>
    <pre className={styles.code}>
      {code.split('\n').map((line, index) => {
        const { path, description } = splitCodeLine(line);
        return (
          <span className={styles.line} key={`${line}-${index}`}>
            <span className={styles.lineNumber}>{index + 1}</span>
            <code>
              <span className={styles.path}>{path || ' '}</span>
              {description && <span className={styles.description}>{description}</span>}
            </code>
          </span>
        );
      })}
    </pre>
  </section>
);
