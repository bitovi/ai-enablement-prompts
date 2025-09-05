# Angular Project Test Commands

## Prerequisites Check
echo "🔍 Checking prerequisites..."

# Check Node.js version
echo "Node.js version:"
node --version

# Check npm version  
echo "npm version:"
npm --version

# Check if Angular CLI is installed
echo "Angular CLI version:"
ng version 2>/dev/null || echo "❌ Angular CLI not installed"

# Check if Nx CLI is available
echo "Nx CLI version:"
nx --version 2>/dev/null || echo "❌ Nx CLI not installed"

## Project Structure Test
echo "📁 Testing project structure..."
if [ -f "angular.json" ]; then
    echo "✅ angular.json found"
else
    echo "❌ angular.json missing"
fi

if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json missing"
fi

if [ -f "tsconfig.json" ]; then
    echo "✅ tsconfig.json found"
else
    echo "❌ tsconfig.json missing"
fi

## Dependency Test
echo "📦 Testing dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
    echo "Checking key dependencies..."
    
    # Check if Angular is installed
    if [ -d "node_modules/@angular/core" ]; then
        echo "✅ @angular/core installed"
    else
        echo "❌ @angular/core missing"
    fi
    
    # Check if Nx is installed
    if [ -d "node_modules/nx" ]; then
        echo "✅ nx installed"
    else
        echo "❌ nx missing"
    fi
else
    echo "❌ node_modules missing - run 'npm install' first"
fi

## Build Test
echo "🏗️ Testing build process..."

# Test if build script exists in package.json
if grep -q "build" package.json; then
    echo "✅ Build scripts found in package.json"
    echo "Available build commands:"
    grep -E "\"(build|test|lint)" package.json | sed 's/^[[:space:]]*/  /'
    
    # Test workspace-specific builds
    echo "Testing workspace builds..."
    npm run build --workspaces --dry-run 2>/dev/null && echo "✅ Workspace builds configured" || echo "❌ Workspace builds not configured"
else
    echo "❌ No build scripts found in package.json"
fi

## Lint Test
echo "🔍 Testing linting..."
npm run lint --workspaces --dry-run 2>/dev/null && echo "✅ Linting configured for workspaces" || echo "❌ Linting not configured"

# Test lint fix capability
npm run lint:fix --workspaces --dry-run 2>/dev/null && echo "✅ Lint fix configured for workspaces" || echo "❌ Lint fix not configured"

## Unit Test Check
echo "🧪 Testing unit tests..."
npm run test --workspaces --dry-run 2>/dev/null && echo "✅ Unit tests configured for workspaces" || echo "❌ Unit tests not configured"

# Also test CI tests
npm run test:ci --workspaces --dry-run 2>/dev/null && echo "✅ CI tests configured for workspaces" || echo "❌ CI tests not configured"

## TypeScript Compilation Test
echo "📝 Testing TypeScript compilation..."
npx tsc --noEmit 2>/dev/null && echo "✅ TypeScript compiles without errors" || echo "❌ TypeScript compilation errors found"

## Build Dry Run
echo "🔧 Performing build dry run..."
npm run build --workspaces --dry-run 2>/dev/null && echo "✅ Build configuration valid for workspaces" || echo "❌ Build configuration issues"

# Test specific workspace builds
echo "Testing specific workspace builds..."
npm run build:emtn-ng --dry-run 2>/dev/null && echo "✅ emtn-ng build configured" || echo "❌ emtn-ng build issues"
npm run build:emtn-dyna-forms --dry-run 2>/dev/null && echo "✅ emtn-dyna-forms build configured" || echo "❌ emtn-dyna-forms build issues"
npm run build:emtn-tester --dry-run 2>/dev/null && echo "✅ emtn-tester build configured" || echo "❌ emtn-tester build issues"
npm run build:emtn-chatty --dry-run 2>/dev/null && echo "✅ emtn-chatty build configured" || echo "❌ emtn-chatty build issues"

## Test Summary
echo ""
echo "📊 Test Summary:"
echo "================"
echo "Run the following commands to verify everything works:"
echo ""
echo "1. Install dependencies:"
echo "   npm install"
echo ""
echo "2. Run linting:"
echo "   npm run lint --workspaces"
echo ""
echo "3. Run tests:"
echo "   npm run test --workspaces"
echo ""
echo "4. Build all projects:"
echo "   npm run build --workspaces"
echo ""
echo "5. Build specific projects:"
echo "   npm run build:emtn-ng"
echo "   npm run build:emtn-dyna-forms"
echo "   npm run build:emtn-tester"
echo "   npm run build:emtn-chatty"
echo ""
echo "6. Clean project (if needed):"
echo "   npm run clean"
echo ""
echo "✨ Test completed!"