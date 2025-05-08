# Voting API Documentation

## Base URL
```
https://votes.kgm-839.workers.dev
```

## Endpoints

### Get Vote Count
Retrieve the current vote count for a specific item.

**Request**
```
GET /votes/:itemId
```

**Parameters**
- `itemId` (path): Unique identifier for the voting item

**Response**
```json
{
  "votes": 42
}
```

### Cast Vote
Increment the vote count for a specific item.

**Request**
```
POST /vote
Content-Type: application/json

{
  "itemId": "question123",
  "userId": "user456"  // Optional, prevents duplicate votes
}
```

**Parameters**
- `itemId` (required): Unique identifier for the voting item
- `userId` (optional): Unique identifier for the voter, prevents duplicate votes

**Response (Success)**
```json
{
  "votes": 43
}
```

**Response (Error)**
```json
{
  "error": "Error message"
}
```

## Error Codes

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Missing itemId, invalid JSON, or already voted |
| 404 | Not Found - Endpoint doesn't exist |

## Usage Limits

- **Free Tier**: 100,000 reads and 1,000 writes per day
- **Response Time**: Typically under 50ms globally

## Example Usage

```javascript
// Get vote count
fetch('https://votes.example.workers.dev/votes/question123')
  .then(response => response.json())
  .then(data => console.log(`Current votes: ${data.votes}`));

// Cast a vote
fetch('https://votes.example.workers.dev/vote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    itemId: 'question123',
    userId: 'user456'
  })
})
  .then(response => response.json())
  .then(data => console.log(`Updated votes: ${data.votes}`));
```