---
name: serp-api
description: "SerpApi integration for search results"
license: MIT
metadata:
  author: Victor Benarbia
---

# SerpApi Integration

This skill describes how to use [SerpApi](https://serpapi.com) to scrape and parse search results from Google, Bing, and other search engines within the Laravel project.

## Installation

The project uses the `serpapi/google-search-results-php` package.

```bash
./vendor/bin/sail composer require serpapi/google-search-results-php
```

## Configuration

Store your API key in the `.env` file:
```env
SERP_API_KEY=your_secret_key
```

And configure it in `config/services.php`:
```php
'serpapi' => [
    'key' => env('SERP_API_KEY'),
],
```

## Basic Usage (BotSync Standard)

All search logic should be encapsulated within the Infrastructure layer.

### Infrastructure Service

```php
namespace App\Infrastructure\Services\Search;

use GoogleSearch;

class SerpSearchService
{
    public function search(string $query): array
    {
        $client = new GoogleSearch(config('services.serpapi.key'));
        $result = $client->get_json([
            'q' => $query,
            'google_domain' => 'google.com',
            'gl' => 'us',
            'hl' => 'en',
        ]);

        return (array) $result;
    }
}
```

## Key Rules

1. **Security**: Never hardcode the API key. Always use `config('services.serpapi.key')`.
2. **Error Handling**: Wrap search calls in try-catch blocks. SerpApi might fail due to rate limits or invalid keys.
3. **Data Integrity**: Sanitize and validate search queries before sending them to the API.
4. **Caching**: Search results are often static for a short period. Use Laravel's `Cache` to reduce API costs and improve performance.
5. **Rate Limiting**: Monitor your account usage to prevent unexpected service interruptions.

## Advanced Search Options

SerpApi supports various parameters:
- `tbm`: `isch` (Images), `nws` (News), `shop` (Shopping).
- `location`: Specific city or country for localized results.
- `device`: `desktop`, `tablet`, or `mobile`.

Refer to the [official SerpApi documentation](https://serpapi.com/search-api) for more details.
