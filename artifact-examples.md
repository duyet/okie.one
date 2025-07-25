# Artifact Examples

With the updated thresholds, these examples should now display as artifacts:

## Code Block Example (15+ lines)
```jsx
import React, { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  
  const increment = () => {
    setCount(count + 1)
  }
  
  const decrement = () => {
    setCount(count - 1)
  }
  
  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  )
}

export default Counter
```

## HTML Example (100+ chars)
```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <h1>Hello World</h1>
    <p>This should now show as an artifact!</p>
</body>
</html>
```

## Updated Thresholds:
- Code blocks: 15+ lines (reduced from 20)
- HTML documents: 100+ chars (reduced from 200)  
- Documents: 1000+ chars (unchanged)