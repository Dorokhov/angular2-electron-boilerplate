'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var sass = require('gulp-sass');
var inject = require('gulp-inject');
var ts = require('gulp-typescript');
var series = require('stream-series');
var livereload = require('gulp-livereload');
var wiredep = require('wiredep').stream;
var jetpack = require('fs-jetpack');
var utils = require('./utils');
var templateCache = require('gulp-angular-templatecache');
var projectDir = jetpack;
var srcDir = projectDir.cwd('./app');
var destDir = projectDir.cwd('./build');
var paths = {
    devDir: [
        './renderer/**/*.js',
        './renderer/**/*.html'
    ],
    copyFromAppDir: [
        './main.js',
        './spec.js',
        './node_modules/**',
        './bower_components/**',
        './vendor/**',
        './renderer/styles/**',
        './renderer/**/*.js',
        './renderer/**/*.html',
    ]
};

var errorHandler = function (title) {
    return function (err) {
        gutil.log(gutil.colors.red('[' + title + ']'), err.toString());
        this.emit('end');
    };
};


// -------------------------------------
// Tasks
// -------------------------------------

gulp.task('clean', function (callback) {
    return destDir.dirAsync('.', { empty: true });
});

var copyStylesTask = function () {
    return projectDir.copyAsync('app/node_modules', srcDir.path('renderer/styles'), {
        overwrite: true,
        relative: true,
        matching: [
            // './angular-material/**/*.css',
            // './angular-material/**/*.ttf',
            // './angular-material/**/*.woff',

            // './angular-ui-grid/**/*.css',
            // './angular-ui-grid/**/*.ttf',
            // './angular-ui-grid/**/*.woff',

            './font-awesome/**/*.css',
            './font-awesome/**/*.ttf',
            './font-awesome/**/*.woff',
            './font-awesome/**/*.woff2',
            './font-awesome/**/*.otf',
            './font-awesome/**/*.eot',
        ],
    });
};
gulp.task('copy-styles', ['clean'], copyStylesTask);

var copyTask = function () {
    return projectDir.copyAsync('app', destDir.path(), {
        overwrite: true,
        matching: paths.copyFromAppDir
    });
};
gulp.task('copy', copyTask);


var srcTask = function () {
    return projectDir.copyAsync('app', destDir.path(), {
        overwrite: true,
        matching: paths.devDir
    });
};
gulp.task('src-watch', srcTask);


var livereloadTask = function () {
    return gulp.src([
        destDir.path('renderer/**/*.js'),
        destDir.path('renderer/**/*.html'),
        destDir.path('renderer/app.html'),
    ])
        .pipe(livereload());
};
gulp.task('livereload-watch', ['src-watch'], livereloadTask);

gulp.task('angular-templates', ['clean'], function () {
    return gulp.src('app/renderer/app/**/templates/**/*.html')
        .pipe(templateCache('templates.js', { standalone: true }))
        .pipe(gulp.dest(function () {
            return destDir.path('renderer/');
        }));
});

var sassTask = function () {
    return gulp.src('app/renderer/**/*.scss')
        .pipe(sass())
        .pipe(gulp.dest(function () {
            return destDir.path('renderer/');
        }));
};
var sassTaskDev = function () {
    return sassTask()
        .pipe(livereload());
};
gulp.task('sass', ['clean'], sassTask);
gulp.task('sass-watch', sassTaskDev);


var typescriptTask = function () {

    var tsProject = ts.createProject({
        target: 'es5',
        sortOutput: true
    });

    return gulp.src('app/renderer/**/*.ts')
        .pipe(ts(tsProject))
        //     .on('error', errorHandler('TypeScript'))
        .pipe(gulp.dest(function () {
            return destDir.path('renderer/');
        }));
};
var typescriptTaskDev = function () {
    return typescriptTask()
        .pipe(livereload());
};
gulp.task('typescript', ['clean'], typescriptTask);
gulp.task('typescript-watch', typescriptTaskDev);


var injectTask = function () {
    var target = gulp.src(destDir.path('renderer/app.html'));
    var sources = gulp.src([
        destDir.path('renderer/**/*.css'),
        destDir.path('renderer/**/*.ttf'),
        destDir.path('renderer/**/*.woff'),
        destDir.path('renderer/**/*.js'),
        '!' + destDir.path('renderer/app.js')
    ], {
            read: false
        });
    var angularEntry = gulp.src([
        destDir.path('renderer/app.js')
    ], {
            read: false
        });

    return target
        .pipe(inject(series(sources, angularEntry), { relative: true }))
        .pipe(gulp.dest(destDir.path('renderer/')));
};
gulp.task('inject', ['angular-templates', 'sass', 'typescript', 'copy'], injectTask);
gulp.task('inject-sass', ['sass-watch'], injectTask);
gulp.task('inject-typescript', ['typescript-watch'], injectTask);
gulp.task('inject-livereload', ['livereload-watch'], injectTask);


gulp.task('finalize', ['clean'], function () {
    var manifest = srcDir.read('package.json', 'json');
    switch (utils.getEnvName()) {
        case 'development':
            // Add "dev" suffix to name, so Electron will write all
            // data like cookies and localStorage into separate place.
            manifest.name += '-dev';
            manifest.productName += ' Dev';
            break;
        case 'test':
            // Add "test" suffix to name, so Electron will write all
            // data like cookies and localStorage into separate place.
            manifest.name += '-test';
            manifest.productName += ' Test';
            // Change the main entry to spec runner.
            manifest.main = 'spec.js';
            break;
    }
    destDir.write('package.json', manifest);

    var configFilePath = projectDir.path('config/env_' + utils.getEnvName() + '.json');
    destDir.copy(configFilePath, 'env_config.json');
});


gulp.task('watch', function () {
    livereload.listen({ reloadPage: 'index.html' });
    gulp.watch(paths.devDir, { cwd: 'app' }, ['inject-livereload']);
    gulp.watch('app/renderer/**/*.ts', ['inject-typescript']);
    gulp.watch('app/renderer/**/*.scss', ['inject-sass']);
    gulp.watch('app/renderer/**/*.scss', ['inject-sass']);
});


gulp.task('build', ['inject', 'finalize']);
