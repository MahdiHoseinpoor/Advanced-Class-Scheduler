import StateManager from './services/StateManager.js';
import UIManager from './ui/UIManager.js';
import EventHandler from './ui/EventHandler.js';

export default class App {
    constructor() {
        this.stateManager = new StateManager();
        this.uiManager = new UIManager();
        this.eventHandler = new EventHandler(this.stateManager, this.uiManager);
    }

    initialize() {
        this.stateManager.loadState();
        this.eventHandler.bindEventListeners();
        this.uiManager.updateUI(this.stateManager);
    }
}