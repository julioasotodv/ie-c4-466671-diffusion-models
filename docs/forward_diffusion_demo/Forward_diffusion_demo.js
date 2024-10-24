importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

function sendPatch(patch, buffers, msg_id) {
  self.postMessage({
    type: 'patch',
    patch: patch,
    buffers: buffers
  })
}

async function startApplication() {
  console.log("Loading pyodide!");
  self.postMessage({type: 'status', msg: 'Loading pyodide'})
  self.pyodide = await loadPyodide();
  self.pyodide.globals.set("sendPatch", sendPatch);
  console.log("Loaded!");
  await self.pyodide.loadPackage("micropip");
  const env_spec = ['https://cdn.holoviz.org/panel/wheels/bokeh-3.4.1-py3-none-any.whl', 'https://cdn.holoviz.org/panel/1.4.4/dist/wheels/panel-1.4.4-py3-none-any.whl', 'pyodide-http==0.2.1', 'PIL', 'matplotlib', 'numpy', 'pandas', 'scipy']
  for (const pkg of env_spec) {
    let pkg_name;
    if (pkg.endsWith('.whl')) {
      pkg_name = pkg.split('/').slice(-1)[0].split('-')[0]
    } else {
      pkg_name = pkg
    }
    self.postMessage({type: 'status', msg: `Installing ${pkg_name}`})
    try {
      await self.pyodide.runPythonAsync(`
        import micropip
        await micropip.install('${pkg}');
      `);
    } catch(e) {
      console.log(e)
      self.postMessage({
	type: 'status',
	msg: `Error while installing ${pkg_name}`
      });
    }
  }
  console.log("Packages loaded!");
  self.postMessage({type: 'status', msg: 'Executing code'})
  const code = `
  \nimport asyncio\n\nfrom panel.io.pyodide import init_doc, write_doc\n\ninit_doc()\n\nfrom panel import state as _pn__state\nfrom panel.io.handlers import CELL_DISPLAY as _CELL__DISPLAY, display, get_figure as _get__figure\n\nimport numpy as np\nfrom scipy import stats\nimport pandas as pd\nfrom PIL import Image\nimport matplotlib\nfrom matplotlib import pyplot as plt\nimport panel as pn\nfrom io import BytesIO\nimport urllib.request\n_pn__state._cell_outputs['b5bcf133-3456-4037-b335-e512cb9f986d'].append((pn.extension()))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['b5bcf133-3456-4037-b335-e512cb9f986d'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['b5bcf133-3456-4037-b335-e512cb9f986d'].append(_fig__out)\n\ndef add_noise(img_tensor_minus_plus_one, beta):\n    noise = np.random.normal(loc=np.zeros_like(img_tensor_minus_plus_one), \n                             scale=np.ones_like(img_tensor_minus_plus_one)*np.sqrt(beta))\n    img_tensor_w_noise = (np.sqrt(1-beta) * img_tensor_minus_plus_one + noise)\n    return noise.astype(np.float16), img_tensor_w_noise.astype(np.float16)\nfile_input = pn.widgets.FileInput(accept="image/*", \n                                  multiple=False,\n                                  margin=(21, 10, 5, 10))\nbeta_input = pn.widgets.FloatInput(name="\\u03B2:", start=0, end=1, step=0.1, value=0.3)\nnum_corruption_steps=16\n\ncorruption_results_list = []\nplot = pn.pane.Matplotlib(object=None, tight=True, width=700)\ndef plot_process(event):\n    \n    player_step = player.value\n    \n    fig = plt.Figure(figsize=(12,8))\n\n    start_image, noise, noisier_image = corruption_results_list[player_step]\n\n    ax1 = fig.add_axes([0., 0.1, 0.3, 0.3])\n    ax1.imshow(((start_image + 1) / 2).astype(np.float32).clip(min=0, max=1), \n               interpolation='nearest', \n               aspect="auto")\n    \n    ax2 = fig.add_axes([0.5, 0.1, 0.3, 0.3])\n    ax2.set_xlim(ax1.get_xlim())\n    ax2.set_ylim(ax1.get_ylim())\n    \n    ax3 = fig.add_axes([0.25, 0.5, 0.3, 0.3])\n    ax3.set_xlim(ax1.get_xlim())\n    ax3.set_ylim(ax1.get_ylim())\n    \n    if player_step not in [0,1,4]:\n        ax2.imshow(((noisier_image + 1) / 2).astype(np.float32).clip(min=0, max=1), \n                   interpolation='nearest', \n                   aspect="auto")\n    else:\n        for pos in ["left", "right", "top", "bottom"]:\n            ax2.spines[pos].set_edgecolor("#ffffff00")\n        ax2.tick_params(axis='both', colors='#ffffff00')\n        \n    if player_step not in [0,4]:\n        ax3.imshow(((noise + 1) / 2).astype(np.float32).clip(min=0, max=1), \n                   interpolation='nearest', \n                   aspect="auto")\n    else:\n        for pos in ["left", "right", "top", "bottom"]:\n            ax3.spines[pos].set_edgecolor("#ffffff00")\n        ax3.tick_params(axis='both', colors='#ffffff00')\n        \n    if player_step in [0,1,2,4]:\n        arrow_1_color = "#ffffff00"\n    else:\n        arrow_1_color = "black"\n    arrow_1 = ax1.annotate('', \n                           xy=(0.72, 0.09),  \n                           xycoords='figure fraction',\n                           xytext=(0.18, 0.09),\n                           arrowprops=dict(arrowstyle="<|-,head_width=0.8, head_length=0.8",\n                                           connectionstyle="bar,fraction=0.1",\n                                           color=arrow_1_color,\n                                           linewidth=2)\n                          )\n    \n    if player_step in [0,1,4]:\n        circle_facecolor = "#ffffff00"\n        circle_edgecolor = "#ffffff00"\n    else:\n        circle_facecolor = "#999999"\n        circle_edgecolor = "black"\n    circle = matplotlib.patches.Ellipse(xy=(0.4,0.25), \n                                        width=0.05, \n                                        height=0.075, \n                                        facecolor=circle_facecolor,\n                                        edgecolor=circle_edgecolor)\n    fig.add_artist(circle)\n    \n    if player_step in [0,1,4]:\n        addition_symbol_color = "#ffffff00"\n    else:\n        addition_symbol_color = "black"\n    addition_symbol = matplotlib.text.Text(x=0.3805, \n                                           y=0.228, \n                                           text="+", \n                                           fontsize=40,\n                                           color=addition_symbol_color)\n    fig.add_artist(addition_symbol)\n    \n    if player_step in [0,1,4]:\n        arrow_2_color = "#ffffff00"\n    else:\n        arrow_2_color = "black"\n    arrow_2 = ax1.annotate('', \n                 xy=(0.415, 0.25), \n                 xytext=(0.34,0.25), \n                 xycoords='figure fraction',\n                 arrowprops=dict(arrowstyle="-|>,head_width=0.8, head_length=0.8",\n                                 linewidth=2,\n                                 color=arrow_2_color\n                                ))\n    \n    if player_step in [0,1,4]:\n        arrow_3_color = "#ffffff00"\n    else:\n        arrow_3_color = "black"\n    arrow_3 = ax1.annotate('', \n                 xy=(0.54, 0.25), \n                 xytext=(0.468,0.25), \n                 xycoords='figure fraction',\n                 arrowprops=dict(arrowstyle="-|>,head_width=0.8, head_length=0.8",\n                                 linewidth=2,\n                                 color=arrow_3_color))\n    \n    if player_step in [0,1,4]:\n        arrow_4_color = "#ffffff00"\n    else:\n        arrow_4_color = "black"\n    arrow_4 = ax1.annotate('', \n                 xy=(0.438, 0.29), \n                 xytext=(0.438,0.5), \n                 xycoords='figure fraction',\n                 arrowprops=dict(arrowstyle="-|>,head_width=0.8, head_length=0.8",\n                                 linewidth=2,\n                                 color=arrow_4_color))\n    \n    if player_step in [0,1,2,3]:\n        text_t = "1"\n    elif player_step in [4,5]:\n        text_t = "2"\n    else:\n        text_t = str(player_step-3)\n    timestep_box = ax1.annotate("$t=%s$" % text_t, \n                                xy=(0.5,0.5), \n                                xycoords='figure fraction',\n                                xytext=(0.075, 0.75), \n                                textcoords='figure fraction',\n                                size=20, \n                                va="center", \n                                ha="center",\n                                bbox=dict(boxstyle="square", fc="w"))\n    \n    if player_step in [1,2,3,5,11]:\n        if player_step == 1:\n            text = "Generate noise as\\n"r"$\\mathcal{N}(\\mathbf{x}_t;\\ 0,\\ \\beta_t\\,\\mathbf{I})$"\n        elif player_step == 2:\n            text = "Scale image by\\n"r"$\\sqrt{1 - \\beta_t}$""\\nand add the noise"\n        elif player_step==3:\n            text = r"Output from step $t$""\\nbecomes the input\\n"r"for step $t+1$"\n        elif player_step == 5:\n            text = "Repeat process\\n(generate noise, \\nscale and add)"\n        elif player_step == 11:\n            text = "Image progressively\\nbecomes noisier,\\nwith less info"\n        description_box = ax1.annotate(text, \n                                       xy=(0.5,0.5), \n                                       xycoords='figure fraction',\n                                       xytext=(0.71, 0.75), \n                                       textcoords='figure fraction',\n                                       size=15, \n                                       va="center", \n                                       ha="center",\n                                       bbox=dict(boxstyle="square", fc="w"))\n\n    plt.close(fig)\n    plot.object = fig\n# Make that when beta_input changes, the player goes back to 1;\n# as well as re-computing corruption_results_list:\nplayer = pn.widgets.Player(name='Discrete Player', \n                           start=0, \n                           end=19, \n                           loop_policy='once',\n                           interval=2000,\n                           show_loop_controls=False,\n                           sizing_mode="stretch_width")\n_pn__state._cell_outputs['c22ac215'].append((player.param.watch(plot_process, "value", onlychanged=False)))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['c22ac215'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['c22ac215'].append(_fig__out)\n\ndef reset_demo(event):\n    \n    corruption_results_list.clear()\n    \n    with BytesIO(file_input.value) as buffer:\n        img = Image.open(buffer)\n        img_tensor = np.array(img) / 255\n\n    # If we have alpha channel, remove it:\n    if img_tensor.shape[-1] == 4:\n        img_tensor = img_tensor[:,:,:3]\n\n    # Scale to [-1,1]:\n    img_tensor_minus_plus_one = img_tensor * 2 - 1\n    img_tensor_minus_plus_one = img_tensor_minus_plus_one.astype(np.float16)\n    \n    start_image = img_tensor_minus_plus_one\n    for corruption_step in range(num_corruption_steps):\n        noise, noisier_image = add_noise(start_image, beta_input.value)\n        corruption_results_list.append((start_image, noise, noisier_image))\n        start_image = noisier_image\n    first_step = corruption_results_list[0]\n    second_step = corruption_results_list[1]\n    corruption_results_list.insert(1, first_step)\n    corruption_results_list.insert(1, first_step)\n    corruption_results_list.insert(1, first_step)\n    corruption_results_list.insert(4, second_step)\n    player.value = 0\nbeta_input.param.watch(reset_demo, 'value')\n_pn__state._cell_outputs['e9798ff4'].append((file_input.param.watch(reset_demo, 'value')))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['e9798ff4'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['e9798ff4'].append(_fig__out)\n\nfile_input.value = urllib.request.urlopen("https://i.postimg.cc/nhVpcdKF/demo-dog.jpg").read()\ntemplate = pn.template.VanillaTemplate(title='Forward diffusion process',\n                                       busy_indicator=None,\n                                       header_background="#434343")\n\n_pn__state._cell_outputs['bdfca25b-561a-4edd-a2c1-8971067d3024'].append((template.config.raw_css.append(\n"""#header{\n           flex-wrap: wrap;\n           justify-content: center;\n          }\n""")))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['bdfca25b-561a-4edd-a2c1-8971067d3024'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['bdfca25b-561a-4edd-a2c1-8971067d3024'].append(_fig__out)\n\napp = pn.Row(pn.Spacer(height=10, sizing_mode="stretch_width"),\n       pn.Column(pn.Row(file_input, beta_input), \n                 plot, \n                 player,\n                 pn.pane.Markdown("Demo by Laura S\xe1nchez & Julio Antonio Soto for IE University. Made with [Panel](https://panel.holoviz.org)")),\n       pn.Spacer(height=10, sizing_mode="stretch_width"),\n       sizing_mode="stretch_width"\n      )\n_pn__state._cell_outputs['c9672d18-d55d-4735-bda6-81ab0a223790'].append((template.main.append(app)))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['c9672d18-d55d-4735-bda6-81ab0a223790'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['c9672d18-d55d-4735-bda6-81ab0a223790'].append(_fig__out)\n\n_pn__state._cell_outputs['da3dff6b-e313-4287-8268-ca7256303116'].append((template.servable()))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['da3dff6b-e313-4287-8268-ca7256303116'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['da3dff6b-e313-4287-8268-ca7256303116'].append(_fig__out)\n\n\nawait write_doc()
  `

  try {
    const [docs_json, render_items, root_ids] = await self.pyodide.runPythonAsync(code)
    self.postMessage({
      type: 'render',
      docs_json: docs_json,
      render_items: render_items,
      root_ids: root_ids
    })
  } catch(e) {
    const traceback = `${e}`
    const tblines = traceback.split('\n')
    self.postMessage({
      type: 'status',
      msg: tblines[tblines.length-2]
    });
    throw e
  }
}

self.onmessage = async (event) => {
  const msg = event.data
  if (msg.type === 'rendered') {
    self.pyodide.runPythonAsync(`
    from panel.io.state import state
    from panel.io.pyodide import _link_docs_worker

    _link_docs_worker(state.curdoc, sendPatch, setter='js')
    `)
  } else if (msg.type === 'patch') {
    self.pyodide.globals.set('patch', msg.patch)
    self.pyodide.runPythonAsync(`
    from panel.io.pyodide import _convert_json_patch
    state.curdoc.apply_json_patch(_convert_json_patch(patch), setter='js')
    `)
    self.postMessage({type: 'idle'})
  } else if (msg.type === 'location') {
    self.pyodide.globals.set('location', msg.location)
    self.pyodide.runPythonAsync(`
    import json
    from panel.io.state import state
    from panel.util import edit_readonly
    if state.location:
        loc_data = json.loads(location)
        with edit_readonly(state.location):
            state.location.param.update({
                k: v for k, v in loc_data.items() if k in state.location.param
            })
    `)
  }
}

startApplication()