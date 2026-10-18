# RuStore — draft listing

Название: Судоку — спокойно (проверить доступность перед регистрацией карточки).

Короткое описание: Классическое судоку с заметками, понятными подсказками и сохранением партии.

Полное описание:

Девять цифр. Один следующий шаг. Решайте судоку в своём темпе: без жизней, штрафов и принудительного проигрыша за неверный ввод.

• Три уровня сложности и 900 проверенных задач.
• Заметки, ластик, отмена и повтор действий.
• Бесплатные подсказки с объяснением логического шага.
• Проверка ошибок по запросу.
• Сохранение текущей партии и локальная статистика.
• Светлое, тёмное и системное оформление.
• Игра доступна без интернета. Для рекламы требуется сеть.

Полноэкранная реклама не прерывает решение: она возможна только после завершения партии при переходе по кнопке. Подсказки не требуют просмотра рекламы.

После прохождения всех задач уровня можно начать повтор. Удаление приложения может удалить локальные сохранения.

## Before submission

- Supply the owner's contact and published privacy-policy URL; complete the policy draft.
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
- Pending: production banner/interstitial IDs, private release signing configuration,
  support contact and final privacy-policy URL. No store release has been built or published.
