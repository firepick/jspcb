module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        mochaTest: {
            test: {
                options: {
                    reporter: 'min',
                    captureFile: 'results.txt',
                    quiet: true,
                    clearRequireCache: true
                },
                src: ['**/*.js']
            }
        },
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'www/js/services.js',
                dest: 'target/services.min.js'
            }
        },
        watch: {
            scripts: {
                files: ['**/*.js'],
                tasks: ['mochaTest'],
                options: {
                    spawn: true,
                },
            },
        },
        jshint: {
            all: ['Gruntfile.js', '**/*.js']
        },
        jsbeautifier: {
            files: ["Gruntfile.js", "bin/*.js", "lib/*.js"],
            options: {
                wrap_line_length: 50,
                keep_array_indentation: true
            }
        }
    });

    //grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-jsbeautifier');
    grunt.loadNpmTasks('grunt-npm-install');

    // Default task(s).
    grunt.registerTask('default', ['uglify']);
    grunt.registerTask('test', ['mochaTest']);

    var customizeJSON = function(original, custom) {
        for (var key in custom) {
            if (custom.hasOwnProperty(key)) {
                if (original.hasOwnProperty(key)) {
                    var customValue = custom[key];
                    var originalValue = original[key];
                    if (typeof customValue === "object" && typeof originalValue == "object") {
                        customizeJSON(originalValue, customValue);
                    } else {
                        original[key] = custom[key];
                    }
                } else {
                    original[key] = custom[key];
                }
            }
        }
    };
};
