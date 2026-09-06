type MarkdownArticleProps = {
  html: string;
  numbered?: boolean;
};

export const MarkdownArticle = ({ html, numbered = false }: MarkdownArticleProps) => (
  <div
    className={`markdown-content${numbered ? ' markdown-content-numbered' : ''}`}
    // Content is authored locally in content/**/*.md and converted on the server.
    dangerouslySetInnerHTML={{ __html: html }}
  />
);
