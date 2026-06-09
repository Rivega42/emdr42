-- #223: уникальность reset token — два пользователя не должны делить один.
-- Postgres UNIQUE индекс допускает множественные NULL — безопасно для
-- пользователей без активного reset.
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");
