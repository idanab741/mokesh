import { toCamelCase } from './toCamelCase.mjs';

const toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};

export { toPascalCase };
//# sourceMappingURL=toPascalCase.mjs.map
