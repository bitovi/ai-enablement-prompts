# Angular Build Commands

## Check project structure
echo "Checking project structure..."
if [ -f "angular.json" ]; then
    echo "✅ Angular project detected"
else
    echo "❌ No angular.json found"
    exit 1
fi

## Install dependencies
echo "Installing dependencies..."
npm install

# Wait for installation to complete
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Additional wait to ensure all post-install scripts complete
echo "Waiting for post-install scripts to complete..."
sleep 3

## Build the project
echo "Building project..."
npm run build 2>/dev/null || ng build 2>/dev/null || npx ng build

echo "Build process completed!"