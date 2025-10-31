/**
 * Launch Report Generator for SmartClone Core
 * Generates a comprehensive launch readiness report
 */

import * as fs from 'fs';
import * as path from 'path';

interface LaunchReport {
  timestamp: string;
  repositoryHealth: {
    requiredFilesPresent: boolean;
    placeholdersResolved: boolean;
    npmConfigValid: boolean;
    githubConfigComplete: boolean;
    buildConfigValid: boolean;
  };
  metrics: {
    totalFiles: number;
    documentationFiles: number;
    configFiles: number;
    sourceFiles: number;
  };
  readinessScore: number;
  recommendations: string[];
  nextSteps: string[];
}

class LaunchReportGenerator {
  private rootDir: string;

  constructor() {
    this.rootDir = process.cwd();
  }

  /**
   * Check if required files exist
   */
  private checkRequiredFiles(): boolean {
    const requiredFiles = [
      'README.md',
      'CONTRIBUTING.md',
      'CODE_OF_CONDUCT.md',
      'LICENSE',
      'SECURITY.md',
      'CHANGELOG.md',
      'ROADMAP.md',
      'package.json',
      '.gitignore',
      'tsconfig.json'
    ];

    return requiredFiles.every(file =>
      fs.existsSync(path.join(this.rootDir, file))
    );
  }

  /**
   * Check for placeholders in critical files
   */
  private checkPlaceholders(): boolean {
    const filesToCheck = [
      'README.md',
      'package.json',
      'SECURITY.md'
    ];

    const placeholders = [
      'yourusername',
      'Your Name',
      'INSERT CONTACT EMAIL'
    ];

    for (const file of filesToCheck) {
      const filePath = path.join(this.rootDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const placeholder of placeholders) {
          if (content.includes(placeholder)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Validate NPM configuration
   */
  private validateNpmConfig(): boolean {
    const pkgPath = path.join(this.rootDir, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return (
        pkg.name &&
        pkg.version &&
        pkg.description &&
        pkg.license &&
        pkg.private !== true
      );
    } catch {
      return false;
    }
  }

  /**
   * Check GitHub configuration completeness
   */
  private checkGitHubConfig(): boolean {
    const githubFiles = [
      '.github/workflows/ci.yml',
      '.github/workflows/publish.yml',
      '.github/workflows/code-quality.yml',
      '.github/ISSUE_TEMPLATE/bug_report.yml',
      '.github/ISSUE_TEMPLATE/feature_request.yml',
      '.github/PULL_REQUEST_TEMPLATE.md'
    ];

    return githubFiles.every(file =>
      fs.existsSync(path.join(this.rootDir, file))
    );
  }

  /**
   * Check build configuration
   */
  private checkBuildConfig(): boolean {
    return (
      fs.existsSync(path.join(this.rootDir, 'tsconfig.json')) &&
      (fs.existsSync(path.join(this.rootDir, 'rollup.config.js')) ||
       fs.existsSync(path.join(this.rootDir, 'rollup.config.ts')))
    );
  }

  /**
   * Count files by category
   */
  private countFiles(): {
    total: number;
    documentation: number;
    config: number;
    source: number;
  } {
    const countInDir = (dir: string, extensions: string[]): number => {
      if (!fs.existsSync(dir)) return 0;

      let count = 0;
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          count += countInDir(fullPath, extensions);
        } else if (stat.isFile()) {
          if (extensions.some(ext => item.endsWith(ext))) {
            count++;
          }
        }
      }

      return count;
    };

    return {
      total: countInDir(this.rootDir, ['.ts', '.js', '.md', '.yml', '.json']),
      documentation: countInDir(this.rootDir, ['.md']),
      config: countInDir(this.rootDir, ['.yml', '.yaml', '.json', '.config.js']),
      source: countInDir(path.join(this.rootDir, 'src'), ['.ts', '.js'])
    };
  }

  /**
   * Calculate readiness score (0-100)
   */
  private calculateReadinessScore(health: LaunchReport['repositoryHealth']): number {
    const weights = {
      requiredFilesPresent: 30,
      placeholdersResolved: 20,
      npmConfigValid: 20,
      githubConfigComplete: 20,
      buildConfigValid: 10
    };

    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      if (health[key as keyof typeof health]) {
        score += weight;
      }
    }

    return score;
  }

  /**
   * Generate recommendations based on health check
   */
  private generateRecommendations(health: LaunchReport['repositoryHealth']): string[] {
    const recommendations: string[] = [];

    if (!health.requiredFilesPresent) {
      recommendations.push('Create all required documentation files');
    }
    if (!health.placeholdersResolved) {
      recommendations.push('Update placeholder values (yourusername, emails, etc.)');
    }
    if (!health.npmConfigValid) {
      recommendations.push('Fix package.json configuration');
    }
    if (!health.githubConfigComplete) {
      recommendations.push('Complete GitHub configuration files');
    }
    if (!health.buildConfigValid) {
      recommendations.push('Set up build configuration');
    }

    if (recommendations.length === 0) {
      recommendations.push('Review GitHub Discussions setup');
      recommendations.push('Configure GitHub Sponsors if applicable');
      recommendations.push('Prepare initial release announcement');
      recommendations.push('Set up NPM_TOKEN in GitHub secrets');
    }

    return recommendations;
  }

  /**
   * Generate next steps based on readiness
   */
  private generateNextSteps(score: number): string[] {
    if (score >= 90) {
      return [
        'Create GitHub repository',
        'Push code to GitHub',
        'Set up GitHub secrets (NPM_TOKEN)',
        'Enable GitHub Discussions',
        'Create initial release (v0.1.0)',
        'Prepare launch announcement',
        'Share with developer communities'
      ];
    } else if (score >= 70) {
      return [
        'Address remaining configuration issues',
        'Review and update placeholder values',
        'Complete documentation',
        'Run validation script again'
      ];
    } else {
      return [
        'Complete all required files',
        'Fix critical configuration issues',
        'Review open source preparation checklist',
        'Run validation script for detailed issues'
      ];
    }
  }

  /**
   * Generate comprehensive launch report
   */
  public generateReport(): LaunchReport {
    const health = {
      requiredFilesPresent: this.checkRequiredFiles(),
      placeholdersResolved: this.checkPlaceholders(),
      npmConfigValid: this.validateNpmConfig(),
      githubConfigComplete: this.checkGitHubConfig(),
      buildConfigValid: this.checkBuildConfig()
    };

    const metrics = this.countFiles();
    const readinessScore = this.calculateReadinessScore(health);
    const recommendations = this.generateRecommendations(health);
    const nextSteps = this.generateNextSteps(readinessScore);

    return {
      timestamp: new Date().toISOString(),
      repositoryHealth: health,
      metrics: {
        totalFiles: metrics.total,
        documentationFiles: metrics.documentation,
        configFiles: metrics.config,
        sourceFiles: metrics.source
      },
      readinessScore,
      recommendations,
      nextSteps
    };
  }

  /**
   * Save report to markdown file
   */
  public saveReportAsMarkdown(report: LaunchReport): void {
    const markdown = this.formatReportAsMarkdown(report);
    const outputPath = path.join(this.rootDir, 'LAUNCH_REPORT.md');
    fs.writeFileSync(outputPath, markdown);
    console.log(`✅ Launch report saved to: ${outputPath}`);
  }

  /**
   * Format report as markdown
   */
  private formatReportAsMarkdown(report: LaunchReport): string {
    const scoreEmoji = report.readinessScore >= 90 ? '🟢' :
                      report.readinessScore >= 70 ? '🟡' : '🔴';

    return `# SmartClone Core - Launch Readiness Report

Generated: ${new Date(report.timestamp).toLocaleString()}

## Overall Readiness Score: ${scoreEmoji} ${report.readinessScore}/100

${report.readinessScore >= 90 ? '✅ **READY FOR LAUNCH**' :
  report.readinessScore >= 70 ? '⚠️ **MOSTLY READY** - Minor issues to address' :
  '❌ **NOT READY** - Critical issues need attention'}

---

## Repository Health

| Check | Status |
|-------|--------|
| Required Files Present | ${report.repositoryHealth.requiredFilesPresent ? '✅ Pass' : '❌ Fail'} |
| Placeholders Resolved | ${report.repositoryHealth.placeholdersResolved ? '✅ Pass' : '❌ Fail'} |
| NPM Config Valid | ${report.repositoryHealth.npmConfigValid ? '✅ Pass' : '❌ Fail'} |
| GitHub Config Complete | ${report.repositoryHealth.githubConfigComplete ? '✅ Pass' : '❌ Fail'} |
| Build Config Valid | ${report.repositoryHealth.buildConfigValid ? '✅ Pass' : '❌ Fail'} |

---

## Repository Metrics

- **Total Files**: ${report.metrics.totalFiles}
- **Documentation Files**: ${report.metrics.documentationFiles}
- **Configuration Files**: ${report.metrics.configFiles}
- **Source Files**: ${report.metrics.sourceFiles}

---

## Recommendations

${report.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

---

## Next Steps

${report.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

---

## Launch Checklist

- [ ] All repository health checks passing
- [ ] Placeholders updated with actual values
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] GitHub Actions workflows enabled
- [ ] NPM_TOKEN secret configured
- [ ] GitHub Discussions enabled
- [ ] Initial release created
- [ ] Launch announcement prepared
- [ ] Community outreach planned

---

*This report was automatically generated by the Launch Report Generator.*
`;
  }

  /**
   * Save report as JSON
   */
  public saveReportAsJson(report: LaunchReport): void {
    const outputPath = path.join(this.rootDir, 'launch-report.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`✅ JSON report saved to: ${outputPath}`);
  }
}

// Run the generator
if (require.main === module) {
  const generator = new LaunchReportGenerator();
  const report = generator.generateReport();

  console.log('🚀 Generating Launch Readiness Report...\n');

  generator.saveReportAsMarkdown(report);
  generator.saveReportAsJson(report);

  console.log(`\n📊 Readiness Score: ${report.readinessScore}/100`);

  if (report.readinessScore >= 90) {
    console.log('🎉 SmartClone Core is READY FOR LAUNCH!');
  } else if (report.readinessScore >= 70) {
    console.log('⚠️  SmartClone Core is mostly ready - review recommendations');
  } else {
    console.log('❌ SmartClone Core needs more work before launch');
  }
}

export default LaunchReportGenerator;
