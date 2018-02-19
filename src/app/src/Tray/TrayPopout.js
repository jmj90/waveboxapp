import { BrowserWindow, screen } from 'electron'
import Resolver from 'Runtime/Resolver'
import Positioner from 'electron-positioner'
import { settingsStore } from 'stores/settings'
import { POPOUT_POSITIONS } from 'shared/Models/Settings/TraySettings'

const privWindow = Symbol('privWindow')
const privPositioner = Symbol('privPositioner')
const privIsDelayedHideTO = Symbol('privIsDelayedHideTO')
const privIsDelayedHide = Symbol('privIdDelayedHide')

class TrayPopout {
  /* ****************************************************************************/
  // Lifecycle
  /* ****************************************************************************/

  constructor () {
    this[privWindow] = undefined
    this[privPositioner] = undefined
    this[privIsDelayedHideTO] = null
    this[privIsDelayedHide] = false
  }

  /**
  * Loads the tray
  */
  load () {
    if (this.isLoaded) { return }
    this[privWindow] = new BrowserWindow({
      width: 450,
      height: 500,
      show: false,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      movable: false,
      resizable: false,
      backgroundColor: '#ffffff',
      transparent: false,
      webPreferences: {
        nodeIntegration: true
      }
    })
    this[privPositioner] = new Positioner(this[privWindow])
    this[privWindow].loadURL(`file://${Resolver.traypopoutScene('popout.html')}`)
    this[privWindow].on('blur', () => this.hide())
  }

  /* ****************************************************************************/
  // Properties
  /* ****************************************************************************/

  get isLoaded () { return !!this[privWindow] }
  get webContentsId () { return this.isLoaded ? this[privWindow].webContents.id : undefined }
  get isVisible () {
    if (this[privIsDelayedHide]) { return true }
    if (this[privWindow].isVisible() && this[privWindow].isFocused()) { return true }
    return false
  }

  /* ****************************************************************************/
  // Utils
  /* ****************************************************************************/

  _throwIfNotLoaded () {
    if (!this.isLoaded) { throw new Error('TrayPopout is not loaded') }
  }

  /* ****************************************************************************/
  // Show / Hide
  /* ****************************************************************************/

  /**
  * Shows the tray
  * @param bounds: the current tray bounds
  */
  show (bounds) {
    this._throwIfNotLoaded()

    const position = settingsStore.getState().tray.popoutPosition
    if (position === POPOUT_POSITIONS.AUTO) {
      if (process.platform === 'darwin') {
        this[privPositioner].move('trayCenter', bounds)
      } else if (process.platform === 'win32') {
        const screenSize = screen.getPrimaryDisplay().workAreaSize

        if (bounds.x < 50) {
          // Taskbar Left
          const { x, y } = this[privPositioner].calculate('trayBottomLeft', bounds)
          this[privWindow].setPosition(x + 60, y)
        } else if (screenSize.width - bounds.x < 50) {
          // Taskbar Right
          this[privPositioner].move('trayBottomRight', bounds)
        } else if (bounds.y < 50) {
          // Taskbar Top
          this[privPositioner].move('trayCenter', bounds)
        } else {
          // Taskbar Bottom
          this[privPositioner].move('trayBottomCenter', bounds)
        }
      } else if (process.platform === 'linux') {
        if (bounds.y < 100) {
          // Taskbar Top
          this[privPositioner].move('trayCenter', bounds)
        } else {
          // Taskbar Bottom
          this[privPositioner].move('trayBottomCenter', bounds)
        }
      }
    } else {
      switch (position) {
        case POPOUT_POSITIONS.TOP_CENTER:
          this[privPositioner].move('trayCenter', bounds)
          break
        case POPOUT_POSITIONS.TOP_LEFT:
          this[privPositioner].move('trayLeft', bounds)
          break
        case POPOUT_POSITIONS.TOP_RIGHT:
          this[privPositioner].move('trayRight', bounds)
          break
        case POPOUT_POSITIONS.BOTTOM_CENTER:
          this[privPositioner].move('trayBottomCenter', bounds)
          break
        case POPOUT_POSITIONS.BOTTOM_LEFT:
          this[privPositioner].move('trayBottomLeft', bounds)
          break
        case POPOUT_POSITIONS.BOTTOM_RIGHT:
          this[privPositioner].move('trayBottomRight', bounds)
          break
      }
    }

    this[privIsDelayedHide] = false
    clearTimeout(this[privIsDelayedHideTO])

    this[privWindow].show()
    this[privWindow].focus()
  }

  /**
  * Hides the tray
  */
  hide () {
    this._throwIfNotLoaded()

    if (process.platform === 'win32') {
      // On windows clicking on the taskbar removes focus from the window.
      // Artifially persist the focus a little longer to avoid the popout
      // flashing in and out
      if (this.isVisible) {
        this[privIsDelayedHide] = true
        this[privIsDelayedHideTO] = setTimeout(() => {
          this[privIsDelayedHide] = false
        }, 250)
      }
    }

    this[privWindow].hide()
  }

  /**
  * Toggles the tray
  * @param bounds: the current tray bounds
  */
  toggle (bounds) {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show(bounds)
    }
  }
}

export default new TrayPopout()