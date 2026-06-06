module.exports = (config) => {
  config.resolve = config.resolve || {};
  config.resolve.extensionAlias = {
    ...(config.resolve.extensionAlias || {}),
    '.js': ['.ts', '.js'],
    '.mjs': ['.mts', '.mjs'],
    '.cjs': ['.cts', '.cjs'],
  };

  return config;
};
