import fs from 'fs';
import path from 'path';
import webpack from 'webpack';
import express from 'express';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import config from './webpack.config';

const promisify = (fn, ...args) => new Promise((resolve, reject) =>
  fn(...args, (err, ...result) => err ? reject(err) : resolve(...result))
);

const tasks = {
  serve() {
    return tasks.templates({
      base: '/'
    }).then(() => {
      const compiler = webpack(config);
      const PORT = 3000;

      return new Promise((resolve, reject) => express()
        .use(webpackDevMiddleware(compiler, { noInfo: true, publicPath: config.output.publicPath }))
        .use(webpackHotMiddleware(compiler))
        .use('/assets', express.static(path.join(__dirname, 'assets')))
        .get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))
        .listen(PORT, 'localhost', (err) => {
          if (err) { return reject(err); }
          console.log(`Listening on port ${PORT}`);
          resolve();
        })
      );
    });
  },

  templates(vars) {
    const templateSrc = 'src/templates/';
    const templateDest = 'static/';
    const inflate = template => template.replace(/{{([^}]+)}}/g, (match, name) => vars[name]);

    return promisify(fs.readdir, templateSrc)
      .then(files => Promise.all(files.map(file =>
        promisify(fs.readFile, templateSrc + file)
          .then(buf => promisify(fs.writeFile, templateDest + file, inflate(buf.toString())))
      )));
  }
};

const argLoop = args => {
  if (!args.length) {
    return;
  }

  let task = args[0];
  if (typeof tasks[task] !== 'function') {
    return console.error('Unknown task: ' + task);
  }

  tasks[task]()
    .then(argLoop.bind(this, args.slice(1)))
    .catch(err => {
      console.error(err.stack);
    });
};

argLoop(process.argv.slice(2));