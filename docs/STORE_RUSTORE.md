# RuStore — draft listing

Название: Судоку — спокойно (проверить доступность перед регистрацией карточки).

Владелец: Хитев Данила Сергеевич.

Почта поддержки: hityov.danila@yandex.ru.

Короткое описание: 1800 судоку, ежедневные задачи и подсказки. Три уровня сложности. Играйте офлайн.

Полное описание:

Девять цифр. Один следующий шаг. Решайте судоку в своём темпе: без жизней, штрафов и принудительного проигрыша за неверный ввод.

• Три уровня сложности и 1800 проверенных задач — по 600 на каждый уровень.
• Ежедневные задачи, календарь и медали за регулярную игру.
• Заметки, ластик, отмена и повтор действий.
• Бесплатные подсказки с объяснением логического шага.
• Проверка ошибок по запросу.
• Сохранение текущей партии, общая статистика и статистика по сложностям.
• Локальный профиль с вашим именем. Вход в аккаунт не обязателен.
• Светлое, тёмное и системное оформление.
• Игра доступна без интернета. Для рекламы требуется сеть.

Полноэкранная реклама не прерывает решение: она возможна только после завершения партии при переходе по кнопке. Подсказки не требуют просмотра рекламы.

После прохождения всех задач уровня можно начать повтор. Удаление приложения может удалить локальные сохранения.

## Before submission

- Support contact is confirmed: `hityov.danila@yandex.ru`. Owner: Хитев Данила Сергеевич. Complete the policy draft and supply its published URL.
- Configure production ad IDs, AppMetrica key and signing. Debug package ends in `.debug`; release package is `ru.danilah.sudokudoku` (availability not yet confirmed).
- Capture Android screenshots on a real device. Browser screenshots in artifacts are UI evidence, not a substitute for store screenshots of the Android build.
- Check every actual advertising and analytics declaration against the merged release manifest and SDK behavior.
- Test final signed APK update over an older build with the same package/signature and saved progress.


## Release setup (2026-10-18)

- RuStore console application ID: `2063772052`.
- Production package: `ru.danilah.sudokudoku` (not the preview `.debug` package).
- Owner confirmed repository secret `APPMETRICA_KEY` has been created.
- Android CI maps it to `ORG_GRADLE_PROJECT_appMetricaKey`; Gradle consumes the existing
  `appMetricaKey` property. The secret value is never stored in source or passed in command arguments.
- Preview builds intentionally override the key with an empty value. Actual SDK event delivery
  is not verified until a production build is configured and tested.
- Owner also confirmed repository secrets `YANDEX_BANNER_ID` and `YANDEX_INTERSTITIAL_ID`
  have been created; their values have not been independently verified.
- Support contact confirmed by the owner: `hityov.danila@yandex.ru`.
- Production ad secrets are wired into the release workflow. The owner corrected both ad IDs on 2026-10-19 (Asia/Yekaterinburg).
  APK inspection confirmed two distinct full `R-M-PAGE_ID-INDEX` IDs and no demo IDs.
- Private production signing key has been generated outside the repository.
- Signed 0.8 APK verified; see `RELEASE_08.md`. Pending: final privacy-policy URL and live ad/analytics delivery check.
  No store release has been published. See `RELEASE_08.md`.
