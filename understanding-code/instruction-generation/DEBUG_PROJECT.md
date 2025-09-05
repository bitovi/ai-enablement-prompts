# Angular Project Debugging Guide

## Common Build Issues and Solutions

### 1. Dependency Installation Problems

#### Error: `npm ERR! peer dep missing`
```bash
# Solution: Install missing peer dependencies
npm install --legacy-peer-deps

# Or force install
npm install --force

# Check what peer dependencies are needed
npm ls --depth=0
```

#### Error: `ERESOLVE unable to resolve dependency tree`
```bash
# Solution: Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### Error: `gyp ERR! build error`
```bash
# Solution: Install build tools
npm install -g node-gyp
# On Windows: npm install -g windows-build-tools
# On Mac: xcode-select --install
```

### 2. Angular/TypeScript Compilation Errors

#### Error: `Cannot find module '@angular/core'`
```bash
# Check if Angular is installed
ls node_modules/@angular/

# Reinstall Angular dependencies
npm install @angular/core @angular/common @angular/compiler

# Verify workspace configuration
cat angular.json | grep -A 5 "projects"
```

#### Error: `Property 'x' does not exist on type 'y'`
```bash
# Check TypeScript configuration
npx tsc --noEmit --listFiles

# Verify tsconfig.json paths
cat tsconfig.json | grep -A 10 "paths"

# Check if types are properly imported
grep -r "import.*from" --include="*.ts" .
```

#### Error: `Module not found: Error: Can't resolve`
```bash
# Check if the module path exists
find . -name "*module-name*" -type f

# Verify workspace imports
grep -r "@ng-libs" --include="*.ts" .

# Check angular.json for library paths
```

### 3. Workspace-Specific Issues

#### Error: `npm ERR! Missing script`
```bash
# List all available scripts
npm run

# Check workspace scripts
npm run --workspaces

# Verify specific workspace exists
ls -la nestjs/server angular ckeditor-webbuild
```

#### Error: `Workspace 'x' not found`
```bash
# Check workspaces configuration
cat package.json | grep -A 5 "workspaces"

# Verify workspace directories exist
for workspace in nestjs/server nestjs/libs/* angular ckeditor-webbuild; do
  echo "Checking: $workspace"
  [ -d "$workspace" ] && echo "✅ Found" || echo "❌ Missing"
done
```

### 4. Build Process Debugging

#### Error: `ng build` fails
```bash
# Run with verbose output
ng build --verbose

# Check for specific project
ng build emtn-ng --configuration=production --verbose

# Verify Angular CLI version
ng version

# Check for conflicting dependencies
npm ls @angular/cli
```

#### Error: Workspace build fails
```bash
# Debug specific workspace build
npm run build:emtn-ng --verbose

# Check if workspace has build script
cd angular && npm run build --if-present

# Verify workspace package.json
cat angular/package.json | grep -A 5 "scripts"
```

### 5. Testing Issues

#### Error: `Test suites failed to run`
```bash
# Run tests with verbose output
npm run test --workspaces -- --verbose

# Check Jest configuration
find . -name "jest.config.*" -type f

# Run specific workspace tests
cd angular && npm test

# Check test setup files
find . -name "*test-setup*" -type f
```

#### Error: `Coverage reports missing`
```bash
# Generate coverage manually
npm run test:ci --workspaces

# Check coverage configuration
grep -r "coverage" --include="*.json" .

# Merge coverage reports
npm run coverage:concat
```

### 6. Linting Issues

#### Error: `ESLint configuration error`
```bash
# Check ESLint configuration
find . -name ".eslintrc.*" -type f

# Run linting with debug
npm run lint --workspaces -- --debug

# Fix linting issues automatically
npm run lint:fix --workspaces
```

### 7. Environment and Path Issues

#### Error: `Command not found: ng`
```bash
# Install Angular CLI globally
npm install -g @angular/cli

# Or use npx
npx ng version

# Check PATH
echo $PATH | grep node
```

#### Error: `Permission denied`
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Or use a Node version manager
# Install nvm and use it to manage Node versions
```

## Debugging Commands Reference

### Project Health Check
```bash
# Check Node.js and npm versions
node --version && npm --version

# Verify project structure
ls -la angular.json package.json tsconfig.json

# Check all workspaces
npm run --workspaces

# Verify dependencies
npm ls --depth=0
```

### Build Debugging
```bash
# Debug build process step by step
npm run clean
npm install
npm run lint --workspaces
npm run test --workspaces
npm run build --workspaces

# Check specific build
npm run build:emtn-ng -- --verbose
```

### Log Analysis
```bash
# Save build logs for analysis
npm run build --workspaces > build.log 2>&1

# Check for common error patterns
grep -i "error\|fail\|missing" build.log

# Check for warnings
grep -i "warn" build.log
```

### Clean Start Debugging
```bash
# Complete reset
npm run clean
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm run build --workspaces
```

## Advanced Debugging Techniques

### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build --workspaces

# Monitor memory usage during build
/usr/bin/time -v npm run build --workspaces
```

### Network Issues
```bash
# Use different npm registry
npm config set registry https://registry.npmjs.org/
npm install

# Check network connectivity
npm ping
```

### Dependency Analysis
```bash
# Check for duplicate dependencies
npm ls --depth=0 | grep -E "(├|└).*@"

# Analyze bundle size
npm install -g webpack-bundle-analyzer
# Then run after build to analyze bundles
```

## When All Else Fails

### Get Help
1. **Check official documentation**
   - Angular: https://angular.io/guide/troubleshooting
   - npm: https://docs.npmjs.com/cli/v8/using-npm/troubleshooting

2. **Create minimal reproduction**
   ```bash
   # Create a simple test project
   ng new test-project
   cd test-project
   ng build
   ```

3. **Share debugging information**
   ```bash
   # Collect system information
   npm version
   ng version
   node --version
   npm config list
   
   # Save to file for sharing
   {
     npm version
     ng version  
     node --version
     npm config list
   } > debug-info.txt
   ```

## Emergency Recovery

### Complete Project Reset
```bash
#!/bin/bash
echo "⚠️  EMERGENCY RESET - This will delete all node_modules"
read -p "Are you sure? (y/N): " confirm
if [[ $confirm == [yY] ]]; then
    npm run clean
    rm -rf node_modules package-lock.json
    find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null
    npm cache clean --force
    npm install
    echo "✅ Reset complete. Try building again."
fi
```

Remember: Always backup your project before attempting major debugging steps!