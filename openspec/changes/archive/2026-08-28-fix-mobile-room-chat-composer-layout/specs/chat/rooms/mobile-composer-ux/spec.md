## Purpose
Мобильная раскладка composer-а сообщений в комнатах обеспечивает доступность поля ввода и кнопок действий на малых экранах, корректную фиксацию у нижнего края, и предсказуемое поведение при открытии экранной клавиатуры.

## ADDED Requirements

### Requirement: Composer is visible and accessible on mobile
Composer в комнатах (group chats) SHALL оставаться полностью видимым на экранах ≤ 640px по ширине и не выходить за пределы вьюпорта по горизонтали.

#### Scenario: Composer fits within viewport width
- **WHEN** пользователь открывает комнату на мобильном устройстве (≤ 640px)
- **THEN** поле ввода и кнопки действий полностью видимы и не обрезаются по правому краю

### Requirement: Sticky bottom positioning with keyboard awareness
Composer SHALL прилипать к нижнему краю экрана и корректно подниматься при показе экранной клавиатуры, не перекрываясь ею.

#### Scenario: Keyboard opens and composer remains usable
- **WHEN** пользователь фокусирует поле ввода и открывается клавиатура
- **THEN** composer остаётся доступным, поле ввода не закрыто клавиатурой, элементы управления кликабельны

### Requirement: Action buttons layout without overflow
Кнопки эмодзи, AI и отправки SHALL располагаться в одной строке или в компактной раскладке без горизонтального скролла и выхода за край.

#### Scenario: Buttons remain aligned without horizontal scroll
- **WHEN** экран ≤ 640px и поле ввода содержит длинный текст
- **THEN** кнопки действий видимы, не уезжают за правую границу, отсутствует горизонтальный скролл контейнера

### Requirement: Safe-area and notch compliance
Composer SHALL учитывать safe-area insets (например, iOS notch/home indicator) и сохранять интерактивные элементы в безопасной зоне.

#### Scenario: Device with bottom safe-area inset
- **WHEN** устройство с нижним safe-area inset (iOS) и composer прилипан к низу
- **THEN** нижние элементы не пересекают зону home indicator; сохраняются достаточные отступы

### Requirement: Performance and input stability
Composer SHALL не вызывать заметных перерисовок/скачков при появлении/скрытии клавиатуры; курсор и ввод остаются стабильными.

#### Scenario: Typing with keyboard toggle
- **WHEN** пользователь переключает клавиатуру (показ/скрытие)
- **THEN** содержимое поля ввода и позиция курсора сохраняются; не происходит сдвигов, мешающих вводу
