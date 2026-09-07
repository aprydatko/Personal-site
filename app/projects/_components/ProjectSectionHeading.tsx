type ProjectSectionHeadingProps = {
  number: string;
  title: string;
  description: string;
};

export const ProjectSectionHeading = ({
  number,
  title,
  description,
}: ProjectSectionHeadingProps) => (
  <div>
    <p className="font-mono text-xs text-muted">{number}</p>
    <h2 className="mt-2 font-sans text-[22px] font-medium tracking-tight">{title}</h2>
    <p className="mt-3 max-w-xs text-sm font-medium leading-6.5 tracking-wide text-muted">
      {description}
    </p>
  </div>
);
