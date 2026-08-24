> ## Documentation Index
> Fetch the complete documentation index at: https://polza.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# POST Embeddings

> Создание векторных представлений текста

## Доступные модели

| Модель                 | ID                       | Размерность |
| ---------------------- | ------------------------ | ----------- |
| text-embedding-3-large | `text-embedding-3-large` | 3072        |
| text-embedding-3-small | `text-embedding-3-small` | 1536        |

## Параметры запроса

| Параметр          | Тип          | Обязательный | Описание                             |
| ----------------- | ------------ | ------------ | ------------------------------------ |
| `model`           | string       | Да           | ID модели                            |
| `input`           | string/array | Да           | Текст или массив текстов             |
| `encoding_format` | string       | Нет          | Формат: float, base64                |
| `dimensions`      | integer      | Нет          | Размерность вывода                   |
| `user`            | string       | Нет          | Идентификатор конечного пользователя |

## Примеры

<CodeGroup>
  ```bash cURL theme={null}
  curl -X POST "https://polza.ai/api/v1/embeddings" \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "text-embedding-3-large",
      "input": ["Пример текста для поиска", "Второй пример"]
    }'
  ```

  ```python Python theme={null}
  from openai import OpenAI

  client = OpenAI(
      base_url="https://polza.ai/api/v1",
      api_key="YOUR_API_KEY"
  )

  response = client.embeddings.create(
      model="text-embedding-3-large",
      input=["Первый документ", "Второй документ"]
  )

  for item in response.data:
      print(f"Index {item.index}: {len(item.embedding)} dimensions")
  ```

  ```javascript JavaScript theme={null}
  const response = await fetch('https://polza.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: 'Текст для получения эмбеддинга'
    })
  });

  const data = await response.json();
  console.log(data.data[0].embedding);
  ```
</CodeGroup>

## Ответ (200)

```json theme={null}
{
  "id": "emb_123456",
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.01, -0.02, 0.03, "..."],
      "index": 0
    },
    {
      "object": "embedding",
      "embedding": [0.03, 0.11, -0.05, "..."],
      "index": 1
    }
  ],
  "model": "text-embedding-3-large",
  "usage": {
    "prompt_tokens": 42,
    "total_tokens": 42,
    "cost_rub": 0.05,
    "cost": 0.05
  }
}
```

## Работа с изображениями

Некоторые модели эмбеддингов поддерживают изображения на входе — это даёт мультимодальные эмбеддинги, которые улавливают визуальный контент вместе с текстом. Полезно для поиска по изображениям, определения визуального сходства и кросс-модального поиска.

Чтобы передать изображение, оберните входные данные в мультимодальный формат с массивом `content`, содержащим объекты `image_url`. В одном блоке ввода можно комбинировать текст и изображения.

| Модель                             | ID                                  | Мультимодальная                       |
| ---------------------------------- | ----------------------------------- | ------------------------------------- |
| Google: Gemini Embedding 2 Preview | `google/gemini-embedding-2-preview` | мультимодальная (текст + изображения) |

```bash theme={null}
curl https://polza.ai/api/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $POLZA_API_KEY" \
  -d '{
  "model": "google/gemini-embedding-2-preview",
  "input": [
    {
      "content": [
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/png;base64,..."
          }
        }
      ]
    }
  ],
  "encoding_format": "float"
}'
```

Текст и изображения можно совместить в одном входе, чтобы получить объединённый эмбеддинг:

```bash theme={null}
curl https://polza.ai/api/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $POLZA_API_KEY" \
  -d '{
    "model": "google/gemini-embedding-2-preview",
    "input": [
      {
        "content": [
          {"type": "text", "text": "Деревянный настил среди зелёного луга"},
          {"type": "image_url", "image_url": {"url": "https://example.com/example.jpg"}}
        ]
      }
    ],
    "encoding_format": "float"
  }'
```

<Note>
  Возможность передавать изображения зависит от модели. Полный список моделей с поддержкой image input см. в разделе «Доступные модели» ниже и в [каталоге моделей](https://polza.ai/models).
</Note>

## Все доступные модели

* YandexGPT Embeddings — Query: `yandex/text-search-query`
* YandexGPT Embeddings — Doc: `yandex/text-search-doc`
* Google: Gemini Embedding 001: `google/gemini-embedding-001`
* Google: Gemini Embedding 2 Preview: `google/gemini-embedding-2-preview` (мультимодальная)
* Qwen: Qwen3 Embedding 8B: `qwen/qwen3-embedding-8b`
* Qwen: Qwen3 Embedding 4B: `qwen/qwen3-embedding-4b`
* OpenAI: Text Embedding Ada 002: `openai/text-embedding-ada-002`
* OpenAI: Text Embedding 3 Small: `openai/text-embedding-3-small`
* OpenAI: Text Embedding 3 Large: `openai/text-embedding-3-large`

## Применения

<CardGroup cols={2}>
  <Card title="Семантический поиск" icon="magnifying-glass">
    Поиск по смыслу, а не по ключевым словам
  </Card>

  <Card title="RAG" icon="book">
    Retrieval-Augmented Generation для LLM
  </Card>

  <Card title="Кластеризация" icon="object-group">
    Группировка похожих документов
  </Card>

  <Card title="Классификация" icon="tags">
    Категоризация текстов
  </Card>
</CardGroup>

## Рекомендации

<Steps>
  <Step title="Нормализуйте тексты">
    Приведите тексты к единому формату перед получением эмбеддингов
  </Step>

  <Step title="Разделяйте на чанки">
    Оптимальный размер чанка: 200-800 токенов
  </Step>

  <Step title="Используйте косинусное сходство">
    Для сравнения эмбеддингов используйте cosine similarity или dot-product
  </Step>

  <Step title="Кэшируйте результаты">
    Сохраняйте эмбеддинги и кэшируйте повторяющиеся по хешу текста
  </Step>
</Steps>


## OpenAPI

````yaml POST /v1/embeddings
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
  /v1/embeddings:
    post:
      tags:
        - Эмбеддинги
      summary: Создать эмбеддинги
      operationId: EmbeddingsController_createEmbeddings[1]
      parameters: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EmbeddingRequestDto'
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EmbeddingResponsePresenter'
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
    EmbeddingRequestDto:
      type: object
      properties:
        input:
          description: Входной текст или массив текстов для создания эмбеддингов
          example: Пример текста для создания эмбеддинга
          oneOf:
            - type: string
              example: Текст для эмбеддинга
            - type: array
              items:
                type: string
              example:
                - Первый текст
                - Второй текст
                - Третий текст
        model:
          type: string
          description: Идентификатор модели для создания эмбеддингов
          example: thenlper/gte-base
        encoding_format:
          type: string
          description: Формат кодирования эмбеддингов
          enum:
            - float
            - base64
          example: float
          default: float
        dimensions:
          type: number
          description: >-
            Размерность выходного эмбеддинга (если модель поддерживает). Должна
            быть меньше или равна максимальной размерности модели
          example: 768
          minimum: 1
        user:
          type: string
          description: >-
            Уникальный идентификатор конечного пользователя для отслеживания и
            предотвращения злоупотреблений
          example: user-123
      required:
        - input
        - model
    EmbeddingResponsePresenter:
      type: object
      properties:
        id:
          type: string
          description: Уникальный идентификатор запроса
          example: gen_581761234567890123
        object:
          type: string
          enum:
            - list
          example: list
          description: Тип объекта (всегда "list")
        data:
          description: Массив эмбеддингов
          type: array
          items:
            $ref: '#/components/schemas/EmbeddingPresenter'
        model:
          type: string
          description: ID модели, которая создала эмбеддинги
          example: thenlper/gte-base
        usage:
          description: Информация об использовании токенов
          allOf:
            - $ref: '#/components/schemas/EmbeddingUsagePresenter'
      required:
        - id
        - object
        - data
        - model
        - usage
    EmbeddingPresenter:
      type: object
      properties:
        object:
          type: string
          enum:
            - embedding
          example: embedding
          description: Тип объекта (всегда "embedding")
        embedding:
          description: Вектор эмбеддинга (массив чисел)
          example:
            - 0.0023064255
            - -0.009327292
            - 0.015797347
          type: array
          items:
            type: number
        index:
          type: number
          description: Индекс в массиве входных данных
          example: 0
      required:
        - object
        - embedding
        - index
    EmbeddingUsagePresenter:
      type: object
      properties:
        prompt_tokens:
          type: number
          description: Количество токенов во входных данных
          example: 8
        total_tokens:
          type: number
          description: Общее количество токенов (для эмбеддингов равно prompt_tokens)
          example: 8
        cost_rub:
          type: object
          description: Стоимость запроса в рублях
          example: 0.00001
          nullable: true
        cost:
          type: object
          description: Стоимость запроса в рублях (alias для cost_rub)
          example: 0.00001
          nullable: true
      required:
        - prompt_tokens
        - total_tokens
  securitySchemes:
    bearer:
      scheme: bearer
      bearerFormat: API Key
      type: http
      description: >-
        API ключ передаётся в заголовке: Authorization: Bearer
        <POLZA_AI_API_KEY>

````
