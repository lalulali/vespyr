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
      // NOTE: peerDependencies intentionally excluded — they inflate the
      // stack label with transitively-required frameworks the repo never
      // directly uses.
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };

      // Independent labels (not else-if): a repo can be Next.js + React +
      // TypeScript + Tailwind simultaneously. Previously Next+React collapsed
      // to Next only.
      if (allDeps.next) detected.add('Next.js');
      if (allDeps.nuxt) detected.add('Nuxt');
      if (allDeps.vue && !allDeps.nuxt) detected.add('Vue');
      if (allDeps.react && !allDeps.next) detected.add('React');
      if (allDeps.svelte) detected.add('Svelte');
      if (allDeps.angular || allDeps['@angular/core']) detected.add('Angular');
      if (allDeps.express || allDeps.koa || allDeps.fastify || allDeps['@nestjs/core']) detected.add('Node.js Backend');

      if (allDeps.typescript || fs.existsSync(path.join(targetDir, 'tsconfig.json'))) {
        detected.add('TypeScript');
      } else {
        detected.add('JavaScript');
      }

      if (allDeps.tailwindcss) detected.add('Tailwind');
    } catch {
      // Corrupt package.json tells us nothing about language — stay neutral
      // instead of mislabeling a non-JS repo as JavaScript.
      detected.add('Unknown (unparseable package.json)');
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
  if (fs.existsSync(path.join(targetDir, 'pyproject.toml')) || fs.existsSync(path.join(targetDir, 'requirements.txt')) || fs.existsSync(path.join(targetDir, 'Pipfile')) || fs.existsSync(path.join(targetDir, 'setup.py')) || fs.existsSync(path.join(targetDir, 'poetry.lock'))) {
    detected.add('Python');
  }

  // 4b. JS monorepo / workspace markers (no language label on their own —
  // they only qualify a package.json hit, so check independently)
  // pnpm-workspace.yaml implies Node.js even when root package.json is absent
  if (fs.existsSync(path.join(targetDir, 'pnpm-workspace.yaml')) || fs.existsSync(path.join(targetDir, 'package-lock.json')) || fs.existsSync(path.join(targetDir, 'yarn.lock')) || fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml'))) {
    if (![...detected].some((d) => d.includes('Script') || d.includes('Node') || d.includes('Next') || d.includes('React') || d.includes('Vue') || d.includes('Nuxt') || d.includes('Svelte') || d.includes('Angular'))) {
      detected.add('JavaScript/Node.js');
    }
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

  // 8. .NET (C#/F#)
  try {
    const topEntries = fs.readdirSync(targetDir);
    if (topEntries.some((f) => f.endsWith('.csproj') || f.endsWith('.fsproj') || f.endsWith('.sln'))) {
      detected.add('.NET (C#/F#)');
    }
    // 9. PHP / Composer
    if (topEntries.includes('composer.json')) detected.add('PHP (Composer)');
    // 10. Swift / Dart
    if (topEntries.includes('Package.swift')) detected.add('Swift');
    if (topEntries.includes('pubspec.yaml')) detected.add('Dart/Flutter');
  } catch {
    // unreadable dir — fall through to Custom / General below
  }

  if (detected.size === 0) {
    return 'Custom / General';
  }

  return Array.from(detected).join(', ');
}

module.exports = {
  detectStack
};
