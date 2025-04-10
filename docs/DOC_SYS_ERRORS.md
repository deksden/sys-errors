# Подсистема обработки ошибок (docs/SYS_ERRORS.md, v0.1.8)

## 🎯 Краткое описание

SYS_ERRORS предоставляет унифицированный механизм для создания, обработки и форматирования ошибок в JavaScript приложениях. Подсистема использует паттерны "цепочка ошибок" и "ошибка операции", обеспечивая структурированное представление ошибок и сохраняя их контекст.

### Основные возможности

- 🔄 Централизованное определение кодов ошибок
- 📝 Создание ошибок с контекстом и метаданными
- ⛓️ Поддержка цепочки ошибок (error chaining)
- 📋 Реализация паттерна "ошибка операции"
- 🎨 Форматирование сообщений с поддержкой шаблонов
- ✅ Валидация ошибок
- 📊 Сериализация для логирования

## 📥 Установка и импорт

### Установка

```bash
npm install @fab33/sys-errors
```

### Импорт

```javascript
// Импорт основных компонентов
import { 
  createError,         // Функция для создания ошибок 
  SystemError,         // Базовый класс ошибок
  ERROR_CODES,         // Доступные коды ошибок
  isRecoverable,       // Проверка возможности восстановления
  checkErrorChain      // Проверка цепочки ошибок (для тестирования)
} from '@fab33/sys-errors';

// ИЛИ можно импортировать отдельные компоненты
import { createError } from '@fab33/sys-errors';
import { ERROR_CODES } from '@fab33/sys-errors';
```

## 📦 Класс `SystemError`

Базовый класс для всех ошибок системы. Расширяет стандартный Error и обогащает его дополнительной функциональностью.

### Свойства класса `SystemError`:

- `code`: `string` - Уникальный код ошибки (например, "SYS_VALIDATION_FAILED")
- `message`: `string` - Отформатированное сообщение об ошибке
- `msg`: `string` - Шаблон сообщения об ошибке (с плейсхолдерами)
- `subsystem`: `string` - Подсистема, в которой произошла ошибка
- `context`: `Object` - Дополнительные данные об ошибке
- `recoverable`: `boolean` - Флаг возможности восстановления
- `original`: `Error` - Исходная ошибка (для цепочки ошибок)
- `docs`: `string?` - Ссылка на документацию по ошибке (опционально)

### Методы класса `SystemError`:

#### `format(): string`
Возвращает форматированное представление ошибки со всей цепочкой:
```javascript
error.format()
// Пример вывода:
// Error occurred: invalid data
// Context: { reason: 'invalid data' }
// From subsystem: example
// See: <link to docs if present>
// Caused by: <original error details if present>
```

#### `toJSON(): Object`
Сериализует ошибку для логирования, обрабатывая все уровни через свойство .original:
```javascript
error.toJSON()
// Пример вывода:
{
  name: 'SystemError',
  code: 'EXAMPLE_ERROR',
  message: 'Error occurred: invalid data',
  subsystem: 'example',
  context: { reason: 'invalid data' },
  recoverable: true,
  docs: '...',
  stack: '...',
  original: { /* original error if present */ }
}
```

## 🛠️ API подсистемы SYS_ERRORS

### Функция `createError()`

Создает системную ошибку с контекстом и метаданными.

```javascript
function createError(
  errorDefinition, // Определение ошибки из ERROR_CODES
  context?,        // Дополнительные данные
  originalError?,  // Исходная ошибка для цепочки
  options?         // Опции создания
)
```

Пример использования:

```javascript
import { createError, ERROR_CODES } from '@fab33/sys-errors';

// Создание ошибки с контекстом
const error = createError(
  ERROR_CODES.SYS.VALIDATION_FAILED,
  { 
    reason: 'Invalid input data',
    problems: ['Field X is required', 'Field Y must be number'],
    problemsText: 'Field X is required, Field Y must be number'
  }
);

// Создание ошибки с исходной ошибкой
try {
  JSON.parse(invalidJson);
} catch (parseError) {
  throw createError(
    ERROR_CODES.SYS.VALIDATION_FAILED,
    { reason: 'Failed to parse JSON' },
    parseError
  );
}
```

### Функция `isRecoverable()`

Проверяет, можно ли восстановиться после ошибки.

```javascript
function isRecoverable(error: Error): boolean
```

Пример использования:

```javascript
import { isRecoverable } from '@fab33/sys-errors';

try {
  await operation();
} catch (error) {
  if (isRecoverable(error)) {
    // Повторить операцию или восстановиться
    await retry(operation);
  } else {
    // Неустранимая ошибка, завершить выполнение
    throw error;
  }
}
```

### Функция `checkErrorChain()`

Проверяет цепочку ошибок на соответствие ожидаемой схеме. Используется преимущественно в тестах.

```javascript
function checkErrorChain(
  error,            // Проверяемая ошибка
  expectedChain     // Массив ожидаемых уровней в цепочке
)
```

Пример использования в тестах:

```javascript
import { checkErrorChain } from '@fab33/sys-errors';

test('проверка цепочки ошибок', () => {
  try {
    await operationThatFails();
  } catch (error) {
    // Проверяем всю цепочку ошибок
    checkErrorChain(error, [
      { 
        code: 'MODULE_OPERATION_FAILED',
        type: 'SystemError',
        message: 'operation failed'
      },
      { 
        code: 'SYS_VALIDATION_FAILED',
        message: ['validation', 'failed']
      }
    ]);
  }
});
```

## 📋 Системные коды ошибок

Базовые коды ошибок доступны через `ERROR_CODES.SYS`:

```javascript
import { ERROR_CODES } from '@fab33/sys-errors';

// Доступные системные коды ошибок:
const systemCodes = ERROR_CODES.SYS;

// Использование кода ошибки
throw createError(
  ERROR_CODES.SYS.VALIDATION_FAILED,
  { 
    reason: 'Validation error',
    problems: ['Invalid input'],
    problemsText: 'Invalid input'
  }
);
```

Системные коды ошибок включают:

```javascript
SYS: {
  // Ошибка инициализации
  INITIALIZATION_FAILED: {
    code: 'SYS_INIT_FAILED',
    message: 'System initialization failed: {reason}'
  },

  // Непредвиденная ошибка
  UNEXPECTED: {
    code: 'SYS_UNEXPECTED',
    message: 'Unexpected error: {reason}'
  },

  // Ошибка валидации
  VALIDATION_FAILED: {
    code: 'SYS_VALIDATION_FAILED',
    message: 'Validation failed: {reason}'
  },

  // Функционал не реализован
  NOT_IMPLEMENTED: {
    code: 'SYS_NOT_IMPLEMENTED',
    message: 'Feature not implemented: {feature}'
  },

  // Некорректный аргумент
  INVALID_ARGUMENT: {
    code: 'SYS_INVALID_ARGUMENT',
    message: 'Invalid argument {name}: {reason}'
  }
}
```

## 🎯 Паттерны обработки ошибок

### Паттерн "Цепочка ошибок"

В системе реализован механизм сохранения полной цепочки ошибок, что позволяет отследить первопричину проблемы:

1. При перехвате ошибки она передается в `originalError` новой ошибки
2. Исходная ошибка сохраняется в свойстве `.original`
3. Каждый уровень цепочки хранит свой контекст
4. Метод `format()` выводит всю цепочку

```javascript
try {
  try {
    throw new Error('Database connection failed');
  } catch (dbError) {
    // Первый уровень цепочки
    throw createError(
      ERROR_CODES.SYS.UNEXPECTED,
      { reason: 'Database error' },
      dbError // Исходная ошибка
    );
  }
} catch (error) {
  // Второй уровень цепочки
  throw createError(
    ERROR_CODES.SYS.INITIALIZATION_FAILED,
    { reason: 'System startup failed' },
    error // Ошибка первого уровня
  );
}
```

### Паттерн "Ошибка операции"

Этот паттерн помогает систематизировать обработку ошибок в функциях:

1. Для каждой публичной функции создается специфический код ошибки операции
2. Все ошибки внутри функции оборачиваются в эту ошибку операции
3. Исходная причина сохраняется в `.original`
4. Это позволяет узнать, на каком этапе произошла ошибка

Рекомендуемые шаги для реализации паттерна в своей подсистеме:

#### 1. Определение кодов ошибок подсистемы

Создайте файл `errors-mysubsystem.js`:

```javascript
// Определение кодов ошибок подсистемы
export const MYSUBSYSTEM_ERROR_CODES = {
  // Ошибка операции для конкретной функции
  /** 
   * Ошибка загрузки данных
   * @file: data-loader.js
   * @function: loadData
   */
  LOAD_DATA_FAILED: {
    code: 'MYSUBSYSTEM_LOAD_DATA_FAILED',
    message: 'Failed to load data: {reason}',
    subsystem: 'mysubsystem',
    recoverable: true,
    contextKeys: ['reason'],
    docs: 'docs/errors/mysubsystem.md#load-data-failed'
  },
  
  // Другие коды ошибок подсистемы
}
```

#### 2. Создание фабрик ошибок

Создайте файл `error-fabs-mysubsystem.js`:

```javascript
import { createError } from '@fab33/sys-errors';
import { MYSUBSYSTEM_ERROR_CODES } from './errors-mysubsystem.js';

/**
 * Создает ошибку операции загрузки данных
 * @file: data-loader.js
 * @function: loadData
 * @error-code: MYSUBSYSTEM_ERROR_CODES.LOAD_DATA_FAILED
 */
export function createLoadDataError(reason, originalError) {
  return createError(
    MYSUBSYSTEM_ERROR_CODES.LOAD_DATA_FAILED,
    { reason },
    originalError
  );
}

// Другие фабрики ошибок
```

#### 3. Использование в коде

Применение в вашей функции:

```javascript
import { createLoadDataError } from './error-fabs-mysubsystem.js';

/**
 * Загружает данные из источника
 * @param {string} source - Источник данных
 * @returns {Promise<Object>} Загруженные данные
 * @throws {SystemError} MYSUBSYSTEM_LOAD_DATA_FAILED - Ошибка загрузки данных
 *   Возможные ошибки в .original:
 *   - Error - Ошибка сетевого запроса
 *   - SYS_VALIDATION_FAILED - Ошибка валидации данных
 */
async function loadData(source) {
  try {
    // Валидация входных данных
    if (!source) {
      throw createError(
        ERROR_CODES.SYS.VALIDATION_FAILED,
        { reason: 'Source is required' }
      );
    }
    
    // Основная логика
    const response = await fetch(source);
    const data = await response.json();
    return data;
  } catch (error) {
    // Все ошибки оборачиваются в ошибку операции
    throw createLoadDataError(
      error.message || 'Unknown error',
      error
    );
  }
}
```

## 🧪 Тестирование ошибок

Для тестирования цепочки ошибок используйте функцию `checkErrorChain()`:

```javascript
import { checkErrorChain } from '@fab33/sys-errors';

test('проверка ошибки загрузки данных', async () => {
  // Подготовка: источника данных нет
  const source = null;
  
  try {
    await loadData(source);
    fail('Ожидалась ошибка');
  } catch (error) {
    // Проверяем всю цепочку ошибок
    checkErrorChain(error, [
      // Верхний уровень: ошибка операции
      { 
        code: 'MYSUBSYSTEM_LOAD_DATA_FAILED',
        type: 'SystemError'
      },
      // Исходная ошибка: ошибка валидации
      { 
        code: 'SYS_VALIDATION_FAILED',
        message: 'Source is required'
      }
    ]);
  }
});
```

## 📚 Лучшие практики

1. **Создание информативных ошибок**
   - Используйте информативные коды ошибок
   - Добавляйте полезный контекст
   - Сохраняйте оригинальные ошибки
   - Используйте шаблоны сообщений

2. **Обработка ошибок**
   - Проверяйте код ошибки (`error.code`)
   - Используйте `isRecoverable()` для определения возможности восстановления
   - Логируйте ошибки со всем контекстом
   - Обрабатывайте только известные ошибки

3. **Интеграция с логированием**
   ```javascript
   try {
     await operation();
   } catch (error) {
     logger.error({ error }, 'Operation failed');
     // error автоматически сериализуется через toJSON()
   }
   ```

## 🔗 Интеграция с другими подсистемами

Подсистема SYS_ERRORS легко интегрируется с другими компонентами системы:

- **Логирование (SYS_LOGGER)**: 

