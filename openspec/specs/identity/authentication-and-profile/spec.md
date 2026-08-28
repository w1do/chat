## Purpose

Defines user identity, profile, and baseline authorization behavior for the chat product while keeping the API suitable for a React SPA. The authentication transport itself is specified in `identity/token-authentication`.

## Requirements

### Requirement: Sign-in is login based and requires no email
The system SHALL let a person register with a chosen login and password only, and SHALL authenticate by that login. Email SHALL NOT be required to register or to sign in.

#### Scenario: Registration with login only
- **WHEN** a visitor submits an unused login and a valid password
- **THEN** the account is created without an email address and the visitor is signed in through the documented JSON contract

#### Scenario: Login already taken
- **WHEN** a visitor submits a login that already exists
- **THEN** the API returns the documented validation error naming the login field

#### Scenario: Successful login
- **WHEN** a registered user submits a valid login and password from the SPA
- **THEN** the API authenticates the user and returns the current user through the documented JSON contract

#### Scenario: Invalid login
- **WHEN** a user submits invalid credentials
- **THEN** the API returns the documented JSON error envelope without revealing whether the login exists

### Requirement: Email is optional and managed in settings
The system SHALL treat email as an optional profile field that a signed-in user can add or change in settings, and SHALL make email-dependent flows available only once an address is set.

#### Scenario: Adding an email later
- **WHEN** a signed-in user saves a valid, unused email in settings
- **THEN** the API persists it on the profile and email-dependent flows become available

#### Scenario: Password recovery without an email
- **WHEN** a user asks to recover a password for an account that has no email address
- **THEN** the API responds through the documented contract and the interface explains that recovery needs an email set in settings, instead of implying a message was sent

### Requirement: SPA authentication is token based
The system SHALL authenticate the SPA with a bearer access token as specified in `identity/token-authentication`, and SHALL restrict cross-origin access with a configured origin allowlist.

#### Scenario: Cross-origin request from disallowed origin
- **WHEN** an authentication request comes from an origin outside the configured allowlist
- **THEN** the API rejects the request according to the CORS and authentication contract

### Requirement: Users can view and update profile
The system SHALL allow authenticated users to view and update basic profile fields — including login, display name, optional email, locale, and timezone — without exposing private security fields.

#### Scenario: Profile update
- **WHEN** an authenticated user submits valid profile changes
- **THEN** the API persists allowed fields and returns the updated profile resource

### Requirement: Authorization is server enforced
The system SHALL enforce user authorization on the server for protected identity and administration actions.

#### Scenario: Unauthenticated profile access
- **WHEN** a guest requests the current profile endpoint
- **THEN** the API returns the documented unauthenticated JSON error response

### Requirement: Identity status is Octane safe
The system SHALL prevent identity, locale, permission, or request data from leaking between sequential requests served by a long-running worker.

#### Scenario: Sequential users on one worker
- **WHEN** two different users make sequential authenticated requests through the same long-running worker
- **THEN** each response contains only the identity and permissions for the current request user

### Requirement: Identity has an integrated web UI
The chat web application SHALL provide login, registration, password recovery, and profile screens built from the identity frontend package in the same stage as the identity API, with loading, error, and keyboard-accessible states.

#### Scenario: User logs in through the SPA
- **WHEN** a user submits valid credentials through the login screen
- **THEN** the SPA authenticates via the documented token flow and navigates to the chat interface showing the current user

### Requirement: Требования к паролю задаёт установка

Минимальная длина пароля SHALL определяться конфигурацией установки и по
умолчанию SHALL быть равна одному символу. Никаких дополнительных требований к
составу пароля (регистр, цифры, символы) система предъявлять НЕ SHALL.

#### Scenario: Короткий пароль при регистрации

- **WHEN** человек регистрируется с паролем из одного символа
- **THEN** аккаунт создаётся: правило соблюдено

#### Scenario: Короткий пароль при смене

- **WHEN** пользователь задаёт себе такой же короткий пароль в настройках
- **THEN** пароль принимается

#### Scenario: Пустой пароль

- **WHEN** поле пароля не заполнено
- **THEN** форма и API отклоняют запрос: пароль обязателен

#### Scenario: Установка требует длиннее

- **WHEN** владелец установки поднял минимальную длину в конфигурации
- **THEN** более короткий пароль отклоняется с понятным объяснением, а
  интерфейс называет ту же длину, что и сервер

### Requirement: Подбор пароля ограничен по частоте

Поскольку пароли могут быть короткими, попытки входа SHALL оставаться
ограниченными по частоте.

#### Scenario: Череда неудачных входов

- **WHEN** с одного адреса подряд идут неудачные попытки входа
- **THEN** дальнейшие попытки получают документированный ответ об ограничении
  частоты

### Requirement: Ошибка ввода объясняется человеку

Сообщение об ошибке в форме SHALL быть написано на языке интерфейса и
объяснять, что не так. Служебные коды и ключи перевода НЕ SHALL показываться
пользователю ни в одной форме — ни при входе и регистрации, ни в настройках
профиля, почты и пароля, ни при отправке сообщения и создании комнаты.

#### Scenario: Слишком короткий пароль

- **WHEN** человек вводит пароль короче требуемого
- **THEN** он видит объяснение с нужной длиной, а не служебный код

#### Scenario: Незаполненное обязательное поле

- **WHEN** обязательное поле оставлено пустым
- **THEN** сообщение называет, чего не хватает

#### Scenario: Неверный формат логина или почты

- **WHEN** введён логин с недопустимыми символами или почта не похожа на почту
- **THEN** сообщение объясняет, каким должно быть значение

### Requirement: Интерфейс узнаёт требования к паролю от установки

Минимальная длина пароля SHALL приходить в интерфейс из конфигурации
установки — той же, по которой проверяет сервер. Интерфейс НЕ SHALL хранить
собственное значение и НЕ SHALL отвергать пароль, который сервер принял бы.
Подсказка рядом с полем SHALL называть действующее число.

#### Scenario: Установка с умолчанием

- **WHEN** владелец установки не менял требование к длине, а человек задаёт
  короткий пароль
- **THEN** форма принимает его и отправляет на сервер, где он тоже принимается

#### Scenario: Установка требует длиннее

- **WHEN** владелец установки поднял минимальную длину
- **THEN** форма требует ровно эту длину и называет её в подсказке и в тексте
  ошибки

#### Scenario: Требование изменили без пересборки

- **WHEN** значение в конфигурации изменили и перезапустили установку
- **THEN** интерфейс использует новое число без пересборки образа

### Requirement: Введённый пароль можно увидеть

Каждое поле ввода пароля SHALL иметь переключатель показа введённого текста:
при входе, при регистрации и при смене пароля — как для текущего пароля, так и
для нового. По умолчанию пароль SHALL быть скрыт; показ включает человек.

Показ SHALL действовать только на то поле, у которого его включили: соседнее
поле пароля в той же форме остаётся скрытым.

Переключатель SHALL быть доступен с клавиатуры, объявлять своё состояние —
показан пароль или скрыт — и иметь имя, по которому однозначно понятно, к
какому полю он относится: в форме смены пароля полей пароля два.

#### Scenario: Человек проверяет, что набрал

- **WHEN** пользователь ввёл пароль и включил показ
- **THEN** он видит введённый текст и может убедиться, что не ошибся

#### Scenario: Возврат к скрытому виду

- **WHEN** пользователь выключает показ
- **THEN** пароль снова скрыт, а введённое значение сохраняется

#### Scenario: Два поля пароля в одной форме

- **WHEN** в форме смены пароля показ включён для нового пароля
- **THEN** текущий пароль остаётся скрытым, а переключатели двух полей
  различимы по имени

#### Scenario: Клавиатура вместо мыши

- **WHEN** пользователь доходит до переключателя клавишей табуляции и нажимает
  его пробелом или вводом
- **THEN** показ переключается, форма при этом НЕ отправляется, а место фокуса
  видно на экране

#### Scenario: Новая форма — новое состояние

- **WHEN** человек переключается между входом и регистрацией или снова
  открывает настройки пароля
- **THEN** пароль в открывшейся форме скрыт: состояние показа не переносится
  между формами

### Requirement: Показ не портит введённый пароль

Пока пароль показан, система НЕ SHALL изменять набранное: автоматические
заглавные буквы, автокоррекция и проверка орфографии для полей пароля SHALL
быть выключены. Показанный пароль НЕ SHALL отправляться на сторонние сервисы
проверки текста.

#### Scenario: Ввод на телефоне с включённым показом

- **WHEN** пользователь на телефоне вводит пароль в открытом виде
- **THEN** первая буква не превращается в заглавную, слова не исправляются, и в
  поле оказывается ровно то, что он набрал

#### Scenario: Пароль остаётся при переключении

- **WHEN** пользователь переключает показ туда и обратно посреди ввода
- **THEN** значение поля не меняется и не теряется

### Requirement: Показ не мешает вводу и сохранению пароля

Переключение показа НЕ SHALL уводить фокус из поля и НЕ SHALL сбрасывать место
курсора: человек продолжает ввод с того места, где остановился.

При отправке формы поле SHALL возвращаться в скрытое состояние — иначе браузер
перестаёт предлагать сохранить или обновить пароль.

#### Scenario: Продолжение ввода после показа

- **WHEN** пользователь посреди набора включает показ и продолжает печатать
- **THEN** буквы дописываются туда же, куда он печатал, а на телефоне
  клавиатура остаётся открытой

#### Scenario: Отправка формы с открытым паролем

- **WHEN** пользователь отправляет форму, не выключив показ
- **THEN** форма отправляется как обычно, поле возвращается в скрытый вид ещё
  до того, как браузер оценит форму, и предложение сохранить пароль появляется
  как прежде

#### Scenario: Отправку отклонили

- **WHEN** отправка не удалась — неверный пароль, занятый логин или ошибка
  проверки
- **THEN** введённое значение сохраняется, поле остаётся скрытым, и человек
  может включить показ снова, чтобы проверить набранное

#### Scenario: Автозаполнение менеджером паролей

- **WHEN** пароль подставляет менеджер паролей браузера
- **THEN** подстановка работает как прежде, независимо от того, включён показ
  или нет

### Requirement: Видно, где находится клавиатурный фокус

Поле формы, на котором стоит клавиатурный фокус, SHALL быть отмечено видимой
рамкой. Это SHALL действовать во всех формах возможности — вход, регистрация,
восстановление, профиль, почта и пароль — и SHALL сохраняться, когда поле
одновременно помечено ошибкой.

#### Scenario: Переход по форме табуляцией

- **WHEN** пользователь переходит между полями формы клавишей табуляции
- **THEN** поле под фокусом видимо отличается от остальных

#### Scenario: Возврат в поле с ошибкой

- **WHEN** отправка отклонена, поле помечено ошибкой, и пользователь
  возвращается в него клавиатурой
- **THEN** видны обе отметки: и ошибка, и фокус — одна не перекрывает другую

#### Scenario: Фокус на переключателе показа

- **WHEN** фокус доходит до переключателя показа пароля внутри поля
- **THEN** видно, что фокус на переключателе, а не на самом поле
