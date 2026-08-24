> ## Documentation Index
> Fetch the complete documentation index at: https://polza.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# POST Audio Transcriptions

> Транскрибация аудио в текст (Speech-to-Text)

<Info>
  Этот эндпоинт совместим с OpenAI SDK и подходит для быстрой миграции существующего кода.
  Если вы разрабатываете новый софт — рекомендуем использовать [Media API](/api-reference/media/create), который предоставляет единый интерфейс для всех медиа-операций.
</Info>

## Доступные модели

| Модель                  | ID                                  | Описание                                                                                                                |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Whisper 1               | `openai/whisper-1`                  | Классическая модель OpenAI (по умолчанию). Поддерживает `verbose_json`, `srt`, `vtt`, пословные/посегментные таймстампы |
| Whisper Large V3        | `openai/whisper-large-v3`           | Улучшенная multilingual-модель OpenAI. Форматы: `json`, `text`, `verbose_json`                                          |
| Whisper Large V3 Turbo  | `openai/whisper-large-v3-turbo`     | Ускоренная версия Large V3. Форматы: `json`, `text`, `verbose_json`                                                     |
| GPT-4o Transcribe       | `openai/gpt-4o-transcribe`          | Высокое качество. Форматы: `json`, `text`. Поддерживает `include: ["logprobs"]`                                         |
| GPT-4o Mini Transcribe  | `openai/gpt-4o-mini-transcribe`     | Быстрая/дешёвая. Форматы: `json`, `text`. Поддерживает `include: ["logprobs"]`                                          |
| Google Chirp 3          | `google/chirp-3`                    | STT от Google. Форматы: `json`, `text`                                                                                  |
| Qwen3 ASR Flash         | `qwen/qwen3-asr-flash-2026-02-10`   | Быстрая multilingual-модель от Qwen. Форматы: `json`, `text`                                                            |
| Voxtral Mini Transcribe | `mistralai/voxtral-mini-transcribe` | STT от Mistral AI. Форматы: `json`, `text`                                                                              |
| Parakeet TDT 0.6B v3    | `nvidia/parakeet-tdt-0.6b-v3`       | Лёгкая и быстрая модель от NVIDIA. Форматы: `json`, `text`                                                              |
| ElevenLabs STT          | `elevenlabs/speech-to-text`         | STT от ElevenLabs. Поддерживает диаризацию через `diarized_json`                                                        |

> Тарификация STT — посекундная (`per_second`), по длительности аудио.

## Параметры запроса

| Параметр                   | Тип                | Обязательный | Описание                                                                                                                                                                                     |
| -------------------------- | ------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file`                     | string             | Да           | Аудиофайл: base64 (`data:audio/mp3;base64,...`) или URL                                                                                                                                      |
| `model`                    | string             | Нет          | Модель транскрибации (по умолчанию `openai/whisper-1`)                                                                                                                                       |
| `language`                 | string             | Нет          | ISO-639-1: `auto` (по умолчанию), `ru`, `en`, `de`, `fr`, `es`, `it`, `pt`, `pl`, `uk`, `nl`, `sv`, `da`, `fi`, `cs`, `sk`, `ro`, `bg`, `hr`, `el`, `tr`, `ar`, `hi`, `zh`, `ja`, `ko`, `id` |
| `temperature`              | number             | Нет          | Температура (0–1, по умолчанию 0). В основном для `whisper-1`                                                                                                                                |
| `response_format`          | enum               | Нет          | `json` (по умолчанию), `text`, `srt`, `verbose_json`, `vtt`, `diarized_json`                                                                                                                 |
| `prompt`                   | string             | Нет          | Контекст транскрипции, до \~2048 символов. **Не** поддерживается для `gpt-4o-transcribe-diarize`                                                                                             |
| `timestamp_granularities`  | string\[]          | Нет          | `word`, `segment` (можно оба). Только `whisper-1` + `verbose_json`                                                                                                                           |
| `chunking_strategy`        | `'auto'` \| object | Нет          | Стратегия разбивки. **Обязателен** для `gpt-4o-transcribe-diarize` при аудио > 30 сек                                                                                                        |
| `include`                  | string\[]          | Нет          | `logprobs`. Только `gpt-4o-transcribe` и `gpt-4o-mini-transcribe`                                                                                                                            |
| `known_speaker_names`      | string\[]          | Нет          | Имена известных спикеров, до 4. Только для диаризации                                                                                                                                        |
| `known_speaker_references` | string\[]          | Нет          | Аудио-референсы спикеров (data-URL). Только для диаризации                                                                                                                                   |
| `stream`                   | boolean            | Нет          | Стриминг ответа. **Не** поддерживается для `whisper-1`                                                                                                                                       |
| `user`                     | string             | Нет          | Идентификатор конечного пользователя                                                                                                                                                         |

### Допустимые `response_format` по моделям

* `openai/whisper-1` → `json`, `text`, `srt`, `verbose_json`, `vtt`
* `openai/gpt-4o-transcribe`, `openai/gpt-4o-mini-transcribe` → `json`, `text`
* `openai/gpt-4o-transcribe-diarize` → `json`, `text`, `diarized_json`
* `elevenlabs/speech-to-text` → стандартный набор + `diarized_json`

### Объект `chunking_strategy` типа `server_vad`

| Поле                  | Тип            | Диапазон | Назначение                          |
| --------------------- | -------------- | -------- | ----------------------------------- |
| `type`                | `'server_vad'` | —        | обязателен                          |
| `prefix_padding_ms`   | number         | ≥ 0      | паддинг перед сегментом, мс         |
| `silence_duration_ms` | number         | ≥ 0      | длительность тишины для разрыва, мс |
| `threshold`           | number         | 0–1      | порог громкости (VAD)               |

Либо строкой: `"chunking_strategy": "auto"`.

## Диаризация (gpt-4o-transcribe-diarize)

Модель `gpt-4o-transcribe-diarize` возвращает разбивку по спикерам. Используйте `response_format: "diarized_json"`.

<Warning>
  При аудио длительностью **более 30 секунд** параметр `chunking_strategy` обязателен. Без него запрос вернёт ошибку 400.
</Warning>

Опционально можно заранее «обучить» диаризатор на конкретные голоса:

* `known_speaker_names` — массив имён, **до 4**. Имена используются как метки спикеров.
* `known_speaker_references` — массив data-URL с короткими аудио-примерами тех же спикеров.

## Поддерживаемые форматы файлов

MP3, WAV, M4A, FLAC, OGG, WebM.

<Note>
  Лимит размера тела — около 15 МБ. На больших файлах возможен 502. Для больших аудио разбивайте файл на части.
</Note>

## Примеры

<CodeGroup>
  ```bash cURL theme={null}
  curl -X POST "https://polza.ai/api/v1/audio/transcriptions" \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "openai/whisper-1",
      "file": "BASE64_ENCODED_AUDIO",
      "language": "ru"
    }'
  ```

  ```python Python theme={null}
  import requests
  import base64

  with open('audio.mp3', 'rb') as f:
      audio_base64 = base64.b64encode(f.read()).decode('utf-8')

  response = requests.post(
      'https://polza.ai/api/v1/audio/transcriptions',
      headers={'Authorization': 'Bearer YOUR_API_KEY'},
      json={
          'model': 'openai/whisper-1',
          'file': audio_base64,
          'language': 'ru'
      }
  )

  data = response.json()
  print(data['text'])
  ```

  ```javascript JavaScript theme={null}
  const fs = require('fs');

  const audioFile = fs.readFileSync('audio.mp3');
  const audioBase64 = audioFile.toString('base64');

  const response = await fetch('https://polza.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'whisper-1',
      file: audioBase64,
      language: 'ru'
    })
  });

  const data = await response.json();
  console.log(data.text);
  ```
</CodeGroup>

### Пример с диаризацией

```bash theme={null}
curl -X POST "https://polza.ai/api/v1/audio/transcriptions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-references-diarize",
    "file": "BASE64_ENCODED_AUDIO",
    "response_format": "diarized_json",
    "chunking_strategy": "auto",
    "known_speaker_names": ["agent", "client"]
  }'
```

## Ответ (200)

### response\_format: json (по умолчанию)

```json theme={null}
{
  "text": "Привет! Это тестовое сообщение.",
  "language": "ru",
  "duration": 10.5,
  "model": "whisper-1",
  "usage": { "durationSeconds": 10.5, "cost": 0.11, "cost_rub": 0.11 }
}
```

### response\_format: verbose\_json (только whisper-1)

```json theme={null}
{
  "text": "Привет, мир!",
  "language": "ru",
  "duration": 5.5,
  "model": "whisper-1",
  "segments": [
    {
      "id": 0,
      "seek": 0,
      "start": 0.0,
      "end": 5.5,
      "text": "Привет, мир!",
      "tokens": [1, 2, 3],
      "temperature": 0,
      "avg_logprob": -0.5,
      "compression_ratio": 1.2,
      "no_speech_prob": 0.01
    }
  ],
  "words": [
    { "word": "Привет", "start": 0.0, "end": 0.5 }
  ],
  "usage": { "durationSeconds": 5.5, "cost": 0.06, "cost_rub": 0.06 }
}
```

Поле `words` появляется, только если указан `timestamp_granularities: ["word"]`.

### response\_format: diarized\_json (gpt-4o-transcribe-diarize)

```json theme={null}
{
  "task": "references",
  "duration": 27.4,
  "text": "agent: Привет!\nclient: Здравствуйте!",
  "segments": [
    {
      "id": "seg_001",
      "start": 0.0,
      "end": 4.7,
      "text": "Привет, как дела?",
      "speaker": "agent",
      "type": "transcript.text.segment"
    }
  ],
  "model": "gpt-4o-references-diarize",
  "usage": { "durationSeconds": 27, "cost": 0.27, "cost_rub": 0.27 }
}
```

### response\_format: text / srt / vtt

Поле `text` содержит результат — plain text либо готовые субтитры в формате SRT/VTT. Поля `segments`/`words` отсутствуют.

## Поля ответа

| Поле       | Описание                                                             |
| ---------- | -------------------------------------------------------------------- |
| `text`     | Полный транскрибированный текст (для `diarized_json` — со спикерами) |
| `language` | Определённый язык (ISO-639-1)                                        |
| `duration` | Длительность аудио в секундах                                        |
| `segments` | Сегменты с таймкодами (для `verbose_json` и `diarized_json`)         |
| `words`    | Слова с таймкодами (при `timestamp_granularities: ["word"]`)         |
| `usage`    | Использование: `durationSeconds`, `cost_rub`, `cost`                 |


## OpenAPI

````yaml POST /v1/audio/transcriptions
openapi: 3.0.0
info:
  title: Polza.ai API
  description: AI агрегатор — унифицированный доступ к сотням AI моделей
  version: '1.0'
  contact: {}
servers:
  - url: https://polza.ai/api
    description: Production
security: []
tags: []
paths:
  /v1/audio/transcriptions:
    post:
      tags:
        - Аудио
      summary: Транскрибировать аудио в текст (STT)
      operationId: AudioSttController_createTranscription[3]
      parameters: []
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/AudioTranscriptionDto'
          application/json:
            schema:
              $ref: '#/components/schemas/AudioTranscriptionDto'
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AudioTranscriptionPresenter'
        '401':
          description: Ошибка авторизации. Проверьте ключ доступа
        '403':
          description: Ошибка доступа. Проверьте права доступа ключа
        '500':
          description: Ошибка сервера. Обратитесь к поставщику услуг
      security:
        - bearer: []
components:
  schemas:
    AudioTranscriptionDto:
      type: object
      properties:
        file:
          type: string
          description: Аудио файл в формате base64 (data:audio/mp3;base64,...) или URL
          example: data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAA...
        model:
          type: string
          description: ID модели для транскрипции
          example: whisper-1
          default: whisper-1
        language:
          type: string
          description: 'Язык аудио в формате ISO-639-1 (например: ru, en, de)'
          example: ru
        prompt:
          type: string
          description: Промпт для улучшения контекста транскрипции
          example: Это разговор об искусственном интеллекте
        response_format:
          type: string
          description: Формат ответа
          enum:
            - json
            - text
            - srt
            - verbose_json
            - vtt
            - diarized_json
          default: json
        temperature:
          type: number
          description: Температура сэмплирования (0-1)
          example: 0
          minimum: 0
          maximum: 1
          default: 0
        timestamp_granularities:
          type: array
          description: Granularity для временных меток (только для verbose_json)
          example:
            - word
            - segment
          items:
            type: string
            enum:
              - word
              - segment
        user:
          type: string
          description: >-
            Уникальный идентификатор конечного пользователя для отслеживания и
            предотвращения злоупотреблений
          example: user-123
        chunking_strategy:
          description: >-
            Chunking strategy для разбивки аудио (обязателен для
            gpt-4o-transcribe-diarize при >30 сек)
          oneOf:
            - type: string
              enum:
                - auto
            - 3ddd07cc-d029-45df-9702-a5d317a8ad7b
          example: auto
        include:
          type: array
          description: Дополнительная информация в ответе (logprobs)
          example:
            - logprobs
          items:
            type: string
            enum:
              - logprobs
        known_speaker_names:
          description: Имена известных спикеров (до 4)
          example:
            - agent
            - customer
          type: array
          items:
            type: array
        known_speaker_references:
          description: Аудио референсы для известных спикеров (data URLs)
          type: array
          items:
            type: array
        stream:
          type: boolean
          description: Стриминг ответа (не поддерживается для whisper-1)
          example: false
      required:
        - file
    AudioTranscriptionPresenter:
      type: object
      properties:
        text:
          type: string
          description: Транскрибированный текст
          example: Привет! Это тестовое сообщение.
        language:
          type: string
          description: Определенный язык аудио (ISO-639-1)
          example: ru
        duration:
          type: number
          description: Длительность аудио в секундах
          example: 10.5
        segments:
          description: Сегменты с таймстампами (для verbose_json)
          type: array
          items:
            $ref: '#/components/schemas/TranscriptionSegmentPresenter'
        words:
          description: Words с таймстампами (для verbose_json с word granularity)
          type: array
          items:
            $ref: '#/components/schemas/TranscriptionWordPresenter'
        model:
          type: string
          description: ID использованной модели
          example: whisper-1
        usage:
          type: object
          description: Информация об использовании
          example:
            durationSeconds: 10.5
            cost: 0.01
            cost_rub: 0.01
      required:
        - text
    TranscriptionSegmentPresenter:
      type: object
      properties:
        id:
          type: number
          description: ID сегмента
          example: 0
        seek:
          type: number
          description: Seek position
          example: 0
        start:
          type: number
          description: Время начала (секунды)
          example: 0
        end:
          type: number
          description: Время окончания (секунды)
          example: 5.5
        text:
          type: string
          description: Текст сегмента
          example: Привет, мир!
        tokens:
          description: Token IDs
          example:
            - 1
            - 2
            - 3
          type: array
          items:
            type: number
        temperature:
          type: number
          description: Температура
          example: 0
        avg_logprob:
          type: number
          description: Средняя log probability
          example: -0.5
        compression_ratio:
          type: number
          description: Compression ratio
          example: 1.2
        no_speech_prob:
          type: number
          description: Вероятность отсутствия речи
          example: 0.01
      required:
        - id
        - seek
        - start
        - end
        - text
        - tokens
        - temperature
        - avg_logprob
        - compression_ratio
        - no_speech_prob
    TranscriptionWordPresenter:
      type: object
      properties:
        word:
          type: string
          description: Слово
          example: Привет
        start:
          type: number
          description: Время начала (секунды)
          example: 0
        end:
          type: number
          description: Время окончания (секунды)
          example: 0.5
      required:
        - word
        - start
        - end
  securitySchemes:
    bearer:
      scheme: bearer
      bearerFormat: API Key
      type: http
      description: >-
        API ключ передаётся в заголовке: Authorization: Bearer
        <POLZA_AI_API_KEY>

````
