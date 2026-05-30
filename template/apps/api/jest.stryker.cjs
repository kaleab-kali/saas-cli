const base = require("./package.json").jest;

module.exports = {
	...base,
	cache: false,
	testRegex: ".*policy\\.service\\.property\\.spec\\.ts$",
};
