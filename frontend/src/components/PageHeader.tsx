import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

const PageHeader = ({ title, description, action }: PageHeaderProps) => {
  return (
    <div className="flex items-start justify-between border-b border-border bg-card px-8 py-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export default PageHeader;
