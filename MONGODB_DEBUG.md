# MongoDB Connection Debugging Guide

## Current Status
- **Error**: SSL/TLS connection error (`tlsv1 alert internal error`)
- **Node.js Version**: v24.9.0
- **MongoDB URI**: Configured in `server/.env`
- **Connection Status**: ❌ Failed

## Debug Endpoints

### 1. Health Check
```bash
curl http://localhost:3001/api/health
```

### 2. MongoDB Debug Endpoint
```bash
curl http://localhost:3001/api/debug/mongodb | python3 -m json.tool
```

## Common Issues & Solutions

### Issue 1: SSL/TLS Error (Current Issue)
**Error**: `tlsv1 alert internal error:ssl3_read_bytes`

**Possible Causes**:
1. Node.js version incompatibility (Node.js 24.x has known SSL issues with MongoDB)
2. OpenSSL version mismatch
3. MongoDB Atlas cluster SSL configuration
4. Network/firewall blocking SSL handshake

**Solutions**:

#### Option A: Use Node.js 18 or 20 (Recommended)
```bash
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 20 LTS
nvm install 20
nvm use 20

# Restart server
cd server
npm start
```

#### Option B: Update MongoDB Driver
```bash
cd server
npm install mongodb@latest
```

#### Option C: Check MongoDB Atlas Settings
1. Go to MongoDB Atlas Dashboard
2. Check **Network Access** - ensure your IP is whitelisted (or use `0.0.0.0/0` for testing)
3. Check **Database Access** - verify user credentials
4. Check **Cluster** status - ensure it's running

#### Option D: Try Alternative Connection String
If using `mongodb+srv://`, try the standard connection string format:
```
mongodb://username:password@cluster0.4ma2dmi.mongodb.net:27017/memoryglass?ssl=true&authSource=admin
```

### Issue 2: Authentication Failed
**Error**: `authentication failed`

**Solutions**:
1. Verify username/password in MongoDB Atlas
2. Check database user has correct permissions
3. Ensure password doesn't contain special characters (URL encode if needed)
4. Verify database name matches (`memoryglass`)

### Issue 3: Connection Timeout
**Error**: `serverSelectionTimeoutMS`

**Solutions**:
1. Check your IP is whitelisted in MongoDB Atlas Network Access
2. Try whitelisting `0.0.0.0/0` temporarily for testing
3. Check firewall/network settings
4. Verify MongoDB Atlas cluster is running

### Issue 4: DNS Resolution Failed
**Error**: `ENOTFOUND` or `getaddrinfo`

**Solutions**:
1. Check cluster hostname in connection string
2. Verify internet connection
3. Try pinging the MongoDB cluster hostname

## Testing Connection

### Test MongoDB Connection String
```bash
# Test from command line (if mongosh is installed)
mongosh "mongodb+srv://aayushpawar4455_db_user:M6WAZoNssgsP8x9U@cluster0.4ma2dmi.mongodb.net/memoryglass"
```

### Test from Node.js
Create a test file `server/test-mongo.js`:
```javascript
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

config();

const uri = process.env.MONGODB_URI;
console.log('Testing connection to:', uri.replace(/:[^:@]+@/, ':***@'));

const client = new MongoClient(uri);

try {
  await client.connect();
  console.log('✅ Connected successfully');
  const db = client.db('memoryglass');
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
} catch (error) {
  console.error('❌ Connection failed:', error.message);
} finally {
  await client.close();
}
```

Run it:
```bash
cd server
node test-mongo.js
```

## Server Logs

Check server logs for detailed error messages:
```bash
tail -f /tmp/server.log
```

Or if running in foreground:
```bash
cd server
npm start
```

## Environment Variables

Verify `.env` file exists and has correct values:
```bash
cat server/.env | grep MONGODB_URI
```

Expected format:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

## Next Steps

1. **Try Node.js 18 or 20** (most likely to fix SSL issue)
2. **Check MongoDB Atlas Network Access** (whitelist your IP)
3. **Verify credentials** in MongoDB Atlas
4. **Test connection** using the debug endpoints above
5. **Check server logs** for detailed error messages

## Quick Fix Commands

```bash
# Check Node.js version
node --version

# Check if .env exists
ls -la server/.env

# View MongoDB URI (masked)
cat server/.env | grep MONGODB_URI | sed 's/:[^:@]*@/:***@/'

# Test debug endpoint
curl http://localhost:3001/api/debug/mongodb

# Check server logs
tail -50 /tmp/server.log
```

