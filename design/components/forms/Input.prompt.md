Текстовое поле с лейблом — для логина, регистрации и любых форм; фокус подсвечивается лунным акцентом.

```jsx
<Input label="Email" type="email" placeholder="you@example.com" />
<Input label="Пароль" type="password" error="Неверный email или пароль" />
```

Props: `label`, `hint` (серая подсказка), `error` (приглушённый danger, рамка + текст), `disabled`. Минимальная высота 44px — touch-target по WCAG.
