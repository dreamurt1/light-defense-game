// 배포용 줄인 Phaser (2026-11-20 라이언: 게임 크기 줄이기). vite.config.ts가 'vite build'에서만 'phaser'를 이 파일로 바꾼다(개발·테스트는 전체 Phaser).
// 게임이 쓰는 것만: phaser/src/phaser-core.js(공식 코어 빌드) + 컨테이너·사각형·선·렌더 텍스처·색·수학 전체.
// 빠진 것: 물리(Arcade·Matter)·타일맵·사운드(게임은 자체 Web Audio)·파티클·글자·비디오·메시 등 → 압축 전 1196KB → 약 866KB, gzip 317KB → 약 191KB.
// 새 Phaser 기능(this.add.xxx)을 쓰면 여기에 그 Factory/Creator를 더할 것 — 빠지면 배포판에서만 'add.xxx is not a function'.
// 2026-11-20: add.text(말풍선·빛 맞힘 글자)를 빠뜨려 배포판에서 적이 빛에 맞을 때 예외 → 판이 멈췄다. 이제 tests/phaserSlim.test.ts가
// 소스의 add.·make. 호출(줄바꿈 포함)이 모두 여기 Factory/Creator에 있는지 확인한다.
require('phaser/src/polyfills/requestVideoFrame');
var CONST = require('phaser/src/const');
var Extend = require('phaser/src/utils/object/Extend');
var Phaser = {
  Animations: require('phaser/src/animations'),
  BlendModes: require('phaser/src/renderer/BlendModes'),
  Cache: require('phaser/src/cache'),
  Cameras: { Scene2D: require('phaser/src/cameras/2d') },
  Core: require('phaser/src/core'),
  Class: require('phaser/src/utils/Class'),
  Data: require('phaser/src/data'),
  Display: require('phaser/src/display'),
  Events: require('phaser/src/events'),
  Game: require('phaser/src/core/Game'),
  GameObjects: {
    DisplayList: require('phaser/src/gameobjects/DisplayList'),
    GameObjectCreator: require('phaser/src/gameobjects/GameObjectCreator'),
    GameObjectFactory: require('phaser/src/gameobjects/GameObjectFactory'),
    UpdateList: require('phaser/src/gameobjects/UpdateList'),
    Components: require('phaser/src/gameobjects/components'),
    GameObject: require('phaser/src/gameobjects/GameObject'),
    Container: require('phaser/src/gameobjects/container/Container'),
    Graphics: require('phaser/src/gameobjects/graphics/Graphics'),
    Image: require('phaser/src/gameobjects/image/Image'),
    Sprite: require('phaser/src/gameobjects/sprite/Sprite'),
    RenderTexture: require('phaser/src/gameobjects/rendertexture/RenderTexture'),
    Shape: require('phaser/src/gameobjects/shape/Shape'),
    Rectangle: require('phaser/src/gameobjects/shape/rectangle/Rectangle'),
    Line: require('phaser/src/gameobjects/shape/line/Line'),
    Text: require('phaser/src/gameobjects/text/Text'),
    Factories: {
      Container: require('phaser/src/gameobjects/container/ContainerFactory'),
      Graphics: require('phaser/src/gameobjects/graphics/GraphicsFactory'),
      Image: require('phaser/src/gameobjects/image/ImageFactory'),
      Sprite: require('phaser/src/gameobjects/sprite/SpriteFactory'),
      RenderTexture: require('phaser/src/gameobjects/rendertexture/RenderTextureFactory'),
      Rectangle: require('phaser/src/gameobjects/shape/rectangle/RectangleFactory'),
      Line: require('phaser/src/gameobjects/shape/line/LineFactory'),
      Text: require('phaser/src/gameobjects/text/TextFactory'),
    },
    Creators: {
      Container: require('phaser/src/gameobjects/container/ContainerCreator'),
      Graphics: require('phaser/src/gameobjects/graphics/GraphicsCreator'),
      Image: require('phaser/src/gameobjects/image/ImageCreator'),
      Sprite: require('phaser/src/gameobjects/sprite/SpriteCreator'),
      RenderTexture: require('phaser/src/gameobjects/rendertexture/RenderTextureCreator'),
      Text: require('phaser/src/gameobjects/text/TextCreator'),
    },
  },
  Input: require('phaser/src/input'),
  Loader: require('phaser/src/loader'),
  Math: require('phaser/src/math'),
  Plugins: require('phaser/src/plugins'),
  Renderer: require('phaser/src/renderer'),
  Scale: require('phaser/src/scale'),
  ScaleModes: require('phaser/src/renderer/ScaleModes'),
  Scene: require('phaser/src/scene/Scene'),
  Scenes: require('phaser/src/scene'),
  Structs: require('phaser/src/structs'),
  Textures: require('phaser/src/textures'),
  Time: require('phaser/src/time'),
  Tweens: require('phaser/src/tweens'),
};
Phaser = Extend(false, Phaser, CONST);
module.exports = Phaser;
global.Phaser = Phaser;
