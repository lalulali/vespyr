const fs = require('fs');
const path = require('path');

/**
 * Automatically inspects repository manifest files to detect technology stack.
 * Returns a descriptive stack string (e.g. "TypeScript, Next.js, Tailwind")
 */
function detectStack(targetDir) {
  const detected = new Set();

  // 1. Check package.json
  const pkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = fs.readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(raw);
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
        ...(pkg.peerDependencies || {})
      };

      if (allDeps.next) detected.add('Next.js');
      else if (allDeps.nuxt) detected.add('Nuxt');
      else if (allDeps.vue) detected.add('Vue');
      else if (allDeps.react) detected.add('React');
      else if (allDeps.svelte) detected.add('Svelte');
      else if (allDeps.express || allDeps.koa || allDeps.fastify || allDeps.nestjs || allDeps['@nestjs/core']) detected.add('Node.js Backend');

      if (allDeps.typescript || fs.existsSync(path.join(targetDir, 'tsconfig.json'))) {
        detected.add('TypeScript');
      } else {
        detected.add('JavaScript');
      }

      if (allDeps.tailwindcss) detected.add('Tailwind');
    } catch {
      detected.add('JavaScript/Node.js');
    }
  }

  // 2. Rust
  if (fs.existsSync(path.join(targetDir, 'Cargo.toml'))) {
    detected.add('Rust');
  }

  // 3. Go
  if (fs.existsSync(path.join(targetDir, 'go.mod'))) {
    detected.add('Go');
  }

  // 4. Python
  if (fs.existsSync(path.join(targetDir, 'pyproject.toml')) || fs.existsSync(path.join(targetDir, 'requirements.txt')) || fs.existsSync(path.join(targetDir, 'Pipfile'))) {
    detected.add('Python');
  }

  // 5. Java / JVM
  if (fs.existsSync(path.join(targetDir, 'pom.xml'))) {
    detected.add('Java (Maven)');
  } else if (fs.existsSync(path.join(targetDir, 'build.gradle')) || fs.existsSync(path.join(targetDir, 'build.gradle.kts'))) {
    detected.add('Java/Kotlin (Gradle)');
  }

  // 6. C / C++ / CMake
  if (fs.existsSync(path.join(targetDir, 'CMakeLists.txt'))) {
    detected.add('C/C++ (CMake)');
  }

  // 7. Ruby
  if (fs.existsSync(path.join(targetDir, 'Gemfile'))) {
    detected.add('Ruby');
  }

  if (detected.size === 0) {
    return 'Custom / General';
  }

  return Array.from(detected).join(', ');
}

module.exports = {
  detectStack
};
