module.exports = {
  stories: ['../src/**/*.stories.(ts|tsx|js|jsx|mdx)'],
  addons: [
    '@storybook/preset-create-react-app',
    '@storybook/addon-actions',
    '@storybook/addon-links',
    '@storybook/addon-viewport/register',
    '@storybook/addon-docs',
    '@storybook/addon-knobs/register',
    '@storybook/addon-cssresources/register',
    // '@storybook/addon-storysource', // TODO Enable this when generating documentation
    '@storybook/addon-a11y/register',
  ],
  webpack: async (config, { configType }) => ({
    ...config,
    module: {
      ...config.module,
      rules: [
        ...config.module.rules,
        {
          test: /\.tsx?$/,
          loader: require.resolve('react-docgen-typescript-loader'),
          options: {}, // your options here
        },
      ],
    },
  }),
}
