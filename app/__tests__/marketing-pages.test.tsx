/**
 * Spec для публичных маркетинговых страниц (#150): home и about.
 * Ключевое: медицинский disclaimer и кризисные линии помощи —
 * обязательный safety-контент, который нельзя потерять при редизайне.
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

import HomePage from '@/app/page';
import AboutPage from '@/app/about/page';

describe('HomePage (#150)', () => {
  it('навигация: about, login, register', () => {
    render(<HomePage />);

    // «О проекте» есть в nav и футере — обе ведут на /about
    screen.getAllByRole('link', { name: /о проекте/i }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/about');
    });
    expect(screen.getByRole('link', { name: /войти/i })).toHaveAttribute('href', '/login');
    expect(screen.getAllByRole('link', { name: /регистрация/i })[0]).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('hero: заголовок и CTA на сессию', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/EMDR-AI Терапия/);
    expect(screen.getByRole('link', { name: /начать сессию/i })).toHaveAttribute(
      'href',
      '/session',
    );
  });

  it('медицинский disclaimer: «не заменяет профессиональную» терапию', () => {
    render(<HomePage />);

    expect(screen.getByText(/не заменяет профессиональную/)).toBeInTheDocument();
  });

  it('кризисная ссылка befrienders с noopener', () => {
    render(<HomePage />);

    const link = screen.getByRole('link', { name: /befrienders/i });
    expect(link).toHaveAttribute('href', 'https://www.befrienders.org');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('футер: ссылки на legal-документы', () => {
    render(<HomePage />);

    expect(screen.getByRole('link', { name: /условия использования/i })).toHaveAttribute(
      'href',
      '/legal/terms',
    );
    expect(screen.getByRole('link', { name: /политика конфиденциальности/i })).toHaveAttribute(
      'href',
      '/legal/privacy',
    );
    expect(screen.getByRole('link', { name: /информированное согласие/i })).toHaveAttribute(
      'href',
      '/legal/consent',
    );
  });
});

describe('AboutPage (#150)', () => {
  it('заголовок и навигация на сессию/регистрацию', () => {
    render(<AboutPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/О платформе EMDR-AI/);
    expect(screen.getByRole('link', { name: /^сессия$/i })).toHaveAttribute('href', '/session');
  });

  it('safety-рекомендации: дополнение к терапии, прекращение при дистрессе', () => {
    render(<AboutPage />);

    expect(screen.getByText(/как дополнение к терапии, а не замену/)).toBeInTheDocument();
    expect(screen.getByText(/прекращать сессию при усилении дистресса/)).toBeInTheDocument();
  });

  it('кризисные линии: Россия, США (988), Великобритания, findahelpline', () => {
    render(<AboutPage />);

    expect(screen.getByText(/8-800-2000-122/)).toBeInTheDocument();
    expect(screen.getByText(/988/)).toBeInTheDocument();
    expect(screen.getByText(/116 123/)).toBeInTheDocument();
    const helpline = screen.getByRole('link', { name: /findahelpline/i });
    expect(helpline).toHaveAttribute('href', 'https://findahelpline.com');
    expect(helpline).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
