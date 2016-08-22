/**
 * @module ui/viewer-controls.reel
 */
var Component = require("montage/ui/component").Component;

/**
 * @class ViewerControls
 * @extends Component
 */
exports.ViewerControls = Component.specialize(/** @lends ViewerControls# */ {
    filtersExpanded: {
        value: false
    },

    handleFilterButtonAction: {
        value: function () {
            this.filtersExpanded = !this.filtersExpanded;
        }
    }
});
