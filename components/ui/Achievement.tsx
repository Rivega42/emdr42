import React from 'react';

export interface AchievementProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  unlocked?: boolean;
}

/* Достижение геймификации дизайн-системы «Лунная ночь» (design/components — .e-achv).
   Unlocked — единственное «свечение» на экране достижений. */
export const Achievement: React.FC<AchievementProps> = ({ icon, title, description, unlocked = false }) => (
  <div className={`e-achv ${unlocked ? 'e-achv--unlocked' : 'e-achv--locked'}`}>
    <span className="e-achv__icon" aria-hidden="true">
      {icon || (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {unlocked ? (
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          ) : (
            <>
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </>
          )}
        </svg>
      )}
    </span>
    <span className="e-achv__title">{title}</span>
    {description && <span className="e-achv__desc">{description}</span>}
  </div>
);
