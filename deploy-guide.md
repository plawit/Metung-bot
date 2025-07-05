# AWS Deployment Guide for RecordMoney LINE Bot

## 🚀 Pre-deployment Checklist

### 1. Prepare Environment Variables
Create these environment variables in AWS Elastic Beanstalk:

```
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=finance-assistant
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SHEETS_SHEET_NAME=บันทึกรายการรายรับรายจ่าย
GOOGLE_CLIENT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY=your_service_account_private_key
PORT=8080
```

### 2. Upload Google Service Account Key
Either:
- Upload `keys/` folder manually after deployment
- Or use AWS Parameter Store/Secrets Manager

### 3. Test Locally First
```bash
npm install
npm start
# Test at http://localhost:3000
```

## 📦 Deployment Methods

### Method 1: AWS Elastic Beanstalk (Recommended)

1. **Install EB CLI:**
```bash
pip install awsebcli
```

2. **Initialize EB:**
```bash
eb init
# Choose region: ap-southeast-1 (Singapore) 
# Choose platform: Node.js
# Choose version: Node.js 18
```

3. **Create Environment:**
```bash
eb create production
```

4. **Set Environment Variables:**
```bash
eb setenv LINE_CHANNEL_ACCESS_TOKEN=your_token \
         LINE_CHANNEL_SECRET=your_secret \
         GEMINI_API_KEY=your_key \
         PINECONE_API_KEY=your_key \
         GOOGLE_SHEETS_SPREADSHEET_ID=your_id
```

5. **Deploy:**
```bash
eb deploy
```

### Method 2: AWS Lambda + API Gateway

1. **Install Serverless:**
```bash
npm install -g serverless
```

2. **Create serverless.yml**
3. **Deploy:**
```bash
serverless deploy
```

### Method 3: EC2 + PM2

1. **Launch EC2 instance**
2. **Install Node.js and PM2**
3. **Clone repository**
4. **Start with PM2:**
```bash
pm2 start index.js --name recordmoney-bot
pm2 startup
pm2 save
```

## 🔧 Configuration

### LINE Bot Webhook URL
Update your LINE Bot webhook URL to:
- EB: `https://your-app.region.elasticbeanstalk.com/webhook`
- Lambda: `https://your-api-gateway-url/webhook`
- EC2: `https://your-domain.com/webhook`

### Health Check
- Path: `/`
- Expected response: "Hello World"

### Database
- Google Sheets: No additional setup needed
- Pinecone: Ensure index exists

## 🚨 Troubleshooting

### Common Issues:

1. **Sharp installation fails:**
   - Fixed with `.ebextensions/01-install-sharp.config`

2. **Environment variables not loaded:**
   - Check EB environment configuration
   - Verify no spaces in variable names

3. **Google Sheets authentication fails:**
   - Ensure service account key is uploaded
   - Check file permissions

4. **LINE webhook verification fails:**
   - Verify channel secret is correct
   - Check request signature validation

### Debug Commands:
```bash
eb logs
eb ssh
eb health
```

## 📊 Monitoring

### CloudWatch Logs
- Application logs: `/aws/elasticbeanstalk/production/var/log/eb-engine.log`
- Access logs: `/aws/elasticbeanstalk/production/var/log/nginx/access.log`

### Health Checks
- Monitor `/` endpoint
- Check memory usage (Sharp can be memory-intensive)

## 💰 Cost Estimation

### Elastic Beanstalk (t3.micro):
- Instance: ~$8/month
- Application Load Balancer: ~$16/month
- **Total: ~$24/month**

### Lambda:
- 1M requests: ~$0.20
- Duration: depends on execution time
- **Total: <$5/month for moderate usage**

## 🔐 Security

1. **Environment Variables**: Never commit API keys to code
2. **HTTPS**: Always use HTTPS in production
3. **IAM Roles**: Use minimal required permissions
4. **VPC**: Consider placing in private subnet if needed

## 🚀 Go Live

1. Deploy to staging first
2. Test all functionalities
3. Update LINE Bot webhook URL
4. Monitor logs for any issues
5. Set up CloudWatch alarms