export default class OVACharacter extends Actor {
    prepareData() {
        super.prepareData();
    }
    prepareDerivedData() {
        super.prepareDerivedData();

        this.items.forEach(item => item.prepareItemData());
    }
}