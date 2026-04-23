export default function LayerControls({ modifierActive, layer3Active }) {
  const api = window.electronAPI

  function toggleModifier() {
    if (!api) return
    if (modifierActive) api.simulateModifierExit()
    else api.simulateModifierEnter()
  }

  function toggleLayer3() {
    if (!api) return
    if (layer3Active) api.simulateLayer3Exit()
    else api.simulateLayer3Enter()
  }

  return (
    <div style={{ padding: 8, display: 'flex', gap: 6 }}>
      <button
        className={`toggle-btn ${modifierActive ? 'on' : 'off'}`}
        onClick={toggleModifier}
        style={{ flex: 1 }}
      >
        {modifierActive ? 'MOD Active' : 'MOD Off'}
      </button>
      <button
        className={`toggle-btn ${layer3Active ? 'l3-on' : 'off'}`}
        onClick={toggleLayer3}
        style={{ flex: 1 }}
      >
        {layer3Active ? 'Layer 3 On' : 'Layer 3 Off'}
      </button>
    </div>
  )
}
