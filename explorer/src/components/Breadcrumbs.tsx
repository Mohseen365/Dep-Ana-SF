import React from 'react';

export interface BreadcrumbItem {
  id: string;
  label: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (id: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="breadcrumbs-nav" aria-label="Investigation Breadcrumbs" data-testid="breadcrumbs">
      <ol className="breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.id}-${index}`} className="breadcrumb-item">
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  className="breadcrumb-link"
                  onClick={() => onNavigate(item.id)}
                  aria-label={`Navigate to ${item.label}`}
                >
                  {item.label}
                </button>
              )}
              {!isLast && <span className="breadcrumb-separator" aria-hidden="true"> › </span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
