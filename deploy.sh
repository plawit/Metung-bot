#!/bin/bash

echo "🚀 RecordMoney LINE Bot - AWS Deployment Script"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
command -v eb >/dev/null 2>&1 || { 
    echo -e "${RED}❌ EB CLI is required but not installed.${NC}" 
    echo "Install with: pip install awsebcli"
    exit 1; 
}

# Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"

# Remove existing zip if exists
rm -f recordmoney-linebot.zip

# Create zip excluding unnecessary files
zip -r recordmoney-linebot.zip . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x "*.log" \
  -x ".env" \
  -x "keys/*" \
  -x "test/*" \
  -x "*.md" \
  -x ".DS_Store"

echo -e "${GREEN}✅ Package created: recordmoney-linebot.zip${NC}"

# Check if EB is initialized
if [ ! -f .elasticbeanstalk/config.yml ]; then
    echo -e "${YELLOW}🔧 Initializing Elastic Beanstalk...${NC}"
    eb init --platform node.js --region ap-southeast-1
fi

# Deploy
echo -e "${YELLOW}🚀 Deploying to AWS...${NC}"
eb deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 Getting application URL...${NC}"
    eb status | grep "CNAME"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo "Check logs with: eb logs"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update LINE Bot webhook URL with your new domain"
echo "2. Set environment variables: eb setenv KEY=value"
echo "3. Upload Google Service Account key if needed"
echo "4. Test your bot!"
echo ""
echo "Useful commands:"
echo "  eb logs           - View application logs"
echo "  eb open           - Open app in browser"
echo "  eb health         - Check health status"
echo "  eb ssh            - SSH into instance"