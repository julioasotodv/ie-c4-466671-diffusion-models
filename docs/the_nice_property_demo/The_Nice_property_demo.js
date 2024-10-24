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
  \nimport asyncio\n\nfrom panel.io.pyodide import init_doc, write_doc\n\ninit_doc()\n\nfrom panel import state as _pn__state\nfrom panel.io.handlers import CELL_DISPLAY as _CELL__DISPLAY, display, get_figure as _get__figure\n\nimport numpy as np\nfrom scipy import stats\nimport pandas as pd\nfrom PIL import Image\nimport matplotlib\nfrom matplotlib import pyplot as plt\nimport panel as pn\nfrom io import BytesIO\nimport urllib.request\n_pn__state._cell_outputs['ca1004fe-85d2-4b76-99c9-622a235c6425'].append((pn.extension('katex', js_files={"add_tm_in_title": "../js/add_tm_in_title.js"})))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['ca1004fe-85d2-4b76-99c9-622a235c6425'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['ca1004fe-85d2-4b76-99c9-622a235c6425'].append(_fig__out)\n\ndef generate_noisy_image(img_tensor_minus_plus_one, t, alphas_bar):\n    image_noisy_t = np.random.normal(loc=np.sqrt(alphas_bar[t])*img_tensor_minus_plus_one,\n                                     scale=np.sqrt((1-alphas_bar[t])*np.ones_like(img_tensor_minus_plus_one)))\n    return image_noisy_t\nbeta_1_input = pn.widgets.FloatInput(name="\\u03B2\\u2081:", \n                                     start=0, \n                                     end=0.9, \n                                     step=0.1, \n                                     value=1e-4,\n                                     width=150)\nbeta_T_input = pn.widgets.FloatInput(name="\\u03B2\\u1D1B:", \n                                     start=2e-4, \n                                     end=1, \n                                     step=0.1, \n                                     value=0.02,\n                                     width=150)\n\ndef change_beta_T_input(event):\n    if beta_1_input.value >= beta_T_input.value:\n        beta_T_input.value = beta_1_input.value + 0.1\n\ndef change_beta_1_input(event):\n    if beta_T_input.value <= beta_1_input.value:\n        beta_1_input.value = beta_T_input.value - 0.1\n\nbeta_1_input.param.watch(change_beta_T_input, "value")\nbeta_T_input.param.watch(change_beta_1_input, "value");\nT_input = pn.widgets.IntInput(name="T:", \n                              start=1, \n                              end=10000, \n                              step=500, \n                              value=1000,\n                              width=150)\nt_input = pn.widgets.IntInput(name="t:", \n                              start=1, \n                              end=10000, \n                              step=100, \n                              value=1,\n                              width=150)\n\ndef change_t_input(event):\n    if T_input.value < t_input.value:\n        t_input.value = T_input.value\n\ndef change_T_input(event):\n    if t_input.value > T_input.value:\n        T_input.value = t_input.value\n\nT_input.param.watch(change_t_input, "value")\nt_input.param.watch(change_T_input, "value");\nlinear_or_cosine = pn.widgets.RadioBoxGroup(options=["linear", "cosine"])\n\ndef disable_beta_inputs(event):\n    if linear_or_cosine.value == "cosine":\n        beta_1_input.disabled = True\n        beta_T_input.disabled = True\n    else:\n        beta_1_input.disabled = False\n        beta_T_input.disabled = False\n\n_pn__state._cell_outputs['35a00e7d'].append((linear_or_cosine.param.watch(disable_beta_inputs, "value")))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['35a00e7d'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['35a00e7d'].append(_fig__out)\n\ndef compute_alphas_bar_linear_schedule(T, beta_1, beta_T):\n    \n    betas = beta_1 + ((beta_T - beta_1) / (T-1)) * np.arange(T)\n    \n    alphas = []\n    for beta_t in betas:\n        alpha_t = 1 - beta_t\n        alphas.append(alpha_t)\n    alphas = np.array(alphas)\n\n    alphas_bar = alphas.cumprod()\n    return alphas_bar\ndef f_cosine_schedule(T, t, s=0.008):\n    return np.cos(((t/T + s) / (1+s)) * (np.pi / 2))**2\n\ndef compute_alphas_bar_cosine_schedule(T):\n    alphas_bar = (f_cosine_schedule(T, np.arange(0, T+1)) \n                  / f_cosine_schedule(T, 0))\n    return alphas_bar\ndef make_noisy_image(img_tensor_minus_plus_one, alphas_bar, t):\n    noisy_image = np.random.normal(loc=np.sqrt(alphas_bar[t])*img_tensor_minus_plus_one,\n                                   scale=np.sqrt((1-alphas_bar[t])*np.ones_like(img_tensor_minus_plus_one)))\n    return noisy_image\nfile_input = pn.widgets.FileInput(accept="image/*", \n                                  multiple=False,\n                                  margin=(21, 10, 5, 10))\nimage = pn.pane.Matplotlib(object=None, tight=True, width=600)\nimage_signal_schedule = pn.pane.Matplotlib(object=None, tight=True, width=400)\ndef plot_signal_schedule(event):\n    fig, ax = plt.subplots(figsize=(5,3))\n    \n    alphas_bar_linear = compute_alphas_bar_linear_schedule(T_input.value, \n                                                           beta_1_input.value,\n                                                           beta_T_input.value)\n    \n    alphas_bar_cosine = compute_alphas_bar_cosine_schedule(T_input.value)\n        \n    ax.plot(np.arange(1, T_input.value+1), alphas_bar_linear, zorder=1, label="linear")\n    ax.plot(np.arange(1, T_input.value+1), alphas_bar_cosine[1:], zorder=1, label="cosine")\n    \n    if linear_or_cosine.value == "linear":\n        ax.scatter([t_input.value], \n                   [alphas_bar_linear[t_input.value-1]],\n                   color="red",\n                   zorder=2)\n    else:\n        ax.scatter([t_input.value], \n                   [alphas_bar_cosine[1:][t_input.value-1]],\n                   color="red",\n                   zorder=2)\n    ax.set_ylabel(r"$\\bar{\\alpha}_t$")\n    ax.set_xlabel("$t$")\n    ax.legend(title="Variance schedule")\n    \n    plt.close(fig)\n    image_signal_schedule.object = fig\n    \nbeta_1_input.param.watch(plot_signal_schedule, 'value')\nbeta_T_input.param.watch(plot_signal_schedule, 'value')\nT_input.param.watch(plot_signal_schedule, 'value')\nt_input.param.watch(plot_signal_schedule, 'value')\nlinear_or_cosine.param.watch(plot_signal_schedule, 'value')\n_pn__state._cell_outputs['cb214a56'].append((file_input.param.watch(plot_signal_schedule, 'value')))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['cb214a56'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['cb214a56'].append(_fig__out)\n\ndef plot_image(event):\n    fig, ax = plt.subplots(figsize=(9,6))\n    \n    if linear_or_cosine.value == "linear":\n        alphas_bar = compute_alphas_bar_linear_schedule(T_input.value, \n                                                        beta_1_input.value,\n                                                        beta_T_input.value)\n    else:\n        alphas_bar = compute_alphas_bar_cosine_schedule(T_input.value)[1:]\n        \n    with BytesIO(file_input.value) as buffer:\n        img = Image.open(buffer)\n        img_tensor = np.array(img) / 255\n\n    # If we have alpha channel, remove it:\n    if img_tensor.shape[-1] == 4:\n        img_tensor = img_tensor[:,:,:3]\n\n    # Scale to [-1,1]:\n    img_tensor_minus_plus_one = img_tensor * 2 - 1\n    \n    noisy_tensor_minus_plus_one = make_noisy_image(img_tensor_minus_plus_one,\n                                                   alphas_bar,\n                                                   t_input.value-1)\n    \n    noisy_img = ((noisy_tensor_minus_plus_one + 1) / 2).clip(min=0, max=1)\n    \n    ax.imshow(noisy_img, \n              interpolation='nearest', \n              aspect="auto")\n    \n    plt.close(fig)\n    image.object = fig\n    \nbeta_1_input.param.watch(plot_image, 'value')\nbeta_T_input.param.watch(plot_image, 'value')\nT_input.param.watch(plot_image, 'value')\nt_input.param.watch(plot_image, 'value')\nlinear_or_cosine.param.watch(plot_image, 'value')\n_pn__state._cell_outputs['05683644'].append((file_input.param.watch(plot_image, 'value')))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['05683644'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['05683644'].append(_fig__out)\n\nfile_input.value = urllib.request.urlopen("https://i.postimg.cc/nhVpcdKF/demo-dog.jpg").read()\ntemplate = pn.template.VanillaTemplate(title='The Nice property',\n                                       busy_indicator=None,\n                                       header_background="#434343")\n\n_pn__state._cell_outputs['7ff1391f-22de-43a1-883a-28fc52c6085e'].append((template.config.raw_css.append(\n"""#header{\n           flex-wrap: wrap;\n           justify-content: center;\n          }\n""")))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['7ff1391f-22de-43a1-883a-28fc52c6085e'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['7ff1391f-22de-43a1-883a-28fc52c6085e'].append(_fig__out)\n\napp = pn.Row(pn.Spacer(height=10, sizing_mode="stretch_width"),\n       pn.Column(pn.pane.LaTeX(r"$q(\\mathbf{x}_t \\mid \\mathbf{x}_0) = \\mathcal{N}(\\mathbf{x}_t; \\sqrt{\\bar\\alpha_t}\\mathbf{x}_0, (1 - \\bar\\alpha_t)\\mathbf{I})$", \n                               align="center",\n                               styles={'font-size': '11pt'}),\n                 pn.Row(pn.Column(file_input,\n                                  pn.Column(pn.pane.HTML('<p style="margin-bottom:0">Variance schedule</p>', margin=0),\n                                            linear_or_cosine),\n                                  pn.Row(beta_1_input, beta_T_input), \n                                  pn.Row(T_input, t_input)),\n                        image_signal_schedule),\n                 image,\n                 pn.pane.Markdown("Demo by Laura S\xe1nchez & Julio Antonio Soto for IE University. Made with [Panel](https://panel.holoviz.org)")),\n       pn.Spacer(height=10, sizing_mode="stretch_width"))\n_pn__state._cell_outputs['7649078f-33e6-4326-ab39-6d21c3f0d91e'].append((template.main.append(app)))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['7649078f-33e6-4326-ab39-6d21c3f0d91e'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['7649078f-33e6-4326-ab39-6d21c3f0d91e'].append(_fig__out)\n\n_pn__state._cell_outputs['52c51a96'].append((template.servable()))\nfor _cell__out in _CELL__DISPLAY:\n    _pn__state._cell_outputs['52c51a96'].append(_cell__out)\n_CELL__DISPLAY.clear()\n_fig__out = _get__figure()\nif _fig__out:\n    _pn__state._cell_outputs['52c51a96'].append(_fig__out)\n\n\nawait write_doc()
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