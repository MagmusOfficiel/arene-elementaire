// =====================================================================
//  Phaser « allégé » : uniquement les modules dont le jeu se sert.
//  On retire la physique (Arcade + Matter), les tilemaps, le son de Phaser
//  (le jeu a son propre moteur audio) : le fichier du moteur est bien plus léger.
// =====================================================================
import 'phaser/src/polyfills/requestVideoFrame';
import CONST from 'phaser/src/const';
import Actions from 'phaser/src/actions';
import Animations from 'phaser/src/animations';
import BlendModes from 'phaser/src/renderer/BlendModes';
import Cache from 'phaser/src/cache';
import Cameras from 'phaser/src/cameras';
import Core from 'phaser/src/core';
import Create from 'phaser/src/create';
import Curves from 'phaser/src/curves';
import Data from 'phaser/src/data';
import Display from 'phaser/src/display';
import Events from 'phaser/src/events';
import Game from 'phaser/src/core/Game';
import GameObjects from 'phaser/src/gameobjects';
import Geom from 'phaser/src/geom';
import Input from 'phaser/src/input';
import Loader from 'phaser/src/loader';
import PMath from 'phaser/src/math';
import Plugins from 'phaser/src/plugins';
import Renderer from 'phaser/src/renderer';
import Scale from 'phaser/src/scale';
import ScaleModes from 'phaser/src/renderer/ScaleModes';
import Scene from 'phaser/src/scene/Scene';
import Scenes from 'phaser/src/scene';
import Structs from 'phaser/src/structs';
import Textures from 'phaser/src/textures';
import Time from 'phaser/src/time';
import Tweens from 'phaser/src/tweens';
import Utils from 'phaser/src/utils';

const Phaser = {
  Actions, Animations, BlendModes, Cache, Cameras, Core, Create, Curves, Data, Display, Events, Game, GameObjects, Geom, Input, Loader,
  Math: PMath, Plugins, Renderer, Scale, ScaleModes, Scene, Scenes, Structs, Textures, Time, Tweens, Utils,
  VERSION: CONST.VERSION, AUTO: CONST.AUTO, CANVAS: CONST.CANVAS, WEBGL: CONST.WEBGL, HEADLESS: CONST.HEADLESS,
  FOREVER: CONST.FOREVER, NONE: CONST.NONE, LEFT: CONST.LEFT, RIGHT: CONST.RIGHT, UP: CONST.UP, DOWN: CONST.DOWN,
};
globalThis.Phaser = Phaser;
export default Phaser;
