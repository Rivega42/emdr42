import React from 'react';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  activeId?: string;
  onSelect?: (id: string) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

/* Sidebar-навигация ЛК дизайн-системы «Лунная ночь» (design/components — .e-sidebar).
   Самый тёмный тон («берег»). Item рендерится <a> при наличии href, иначе <button>. */
export const Sidebar: React.FC<SidebarProps> = ({ sections, activeId, onSelect, header, footer }) => (
  <aside className="e-sidebar">
    {header}
    {sections.map((section, si) => (
      <nav className="e-sidebar__section" key={section.title || si} aria-label={section.title || 'Навигация'}>
        {section.title && <span className="e-sidebar__title">{section.title}</span>}
        {section.items.map((item) => {
          const active = item.id === activeId;
          const className = `e-sidebar__item${active ? ' e-sidebar__item--active' : ''}`;
          const common = {
            className,
            'aria-current': active ? ('page' as const) : undefined,
            onClick: () => {
              item.onClick?.();
              onSelect?.(item.id);
            },
          };
          return item.href ? (
            <a key={item.id} href={item.href} {...common}>
              {item.icon}
              <span>{item.label}</span>
            </a>
          ) : (
            <button key={item.id} type="button" {...common}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    ))}
    {footer}
  </aside>
);
