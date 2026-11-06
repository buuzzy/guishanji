/** 版本号、幕与结局 —— 因果域（③）：发生什么、有什么后果。
 *
 *  版本常量决定「这份存档属于哪一版内容」（旧档按它自己那一版继续跑）。
 *  ACTS 是六幕的标题；ENDINGS 是八种结局的标题与结语。
 */

export const PREVIOUS_VERSION = '0.1.0-preview.2';
export const PREVIOUS_CONTENT_REVISION = 'a-life-in-changing-worlds-02';
export const PREVIEW3_VERSION = '0.1.0-preview.3';
export const PREVIEW3_CONTENT_REVISION = 'choices-in-an-unknown-world-03';
export const ADVENTURE_VERSION = '0.1.0-preview.4';
export const CONTENT_REVISION = 'many-roads-through-a-life-04';
export const LEGACY_VERSION = '0.1.0-preview.1';
export const LEGACY_CONTENT_REVISION = 'return-to-the-mountains-01';
export const ACTS = ['山门有灯', '一夜倾覆', '异域问道', '天地来客', '千山归途', '余生有处'];

export const ENDINGS = {
  restore: { title: '守山人', text: '你没有让一生停在山门覆灭，也没有把胜利当成下一个刷境界的起点。后来有人问渡云宗最好的功法是什么，弟子指向那条始终留着的出山路。' },
  wander: { title: '长路未尽', text: '故乡与异乡都留下能落脚的灯。你仍去看新的大陆，但这一次不需要从火里出逃，也不需要把每次相遇都换成修为。' },
  beyond: { title: '渡海人', text: '界海另一边仍有未知的世界。你带走的是地图、朋友的托付与一条能返回的路，留给后来者的是不必献出名字的界门。' },
  exile: { title: '另岸新火', text: '渡云宗没有回到原来的山上，传承却没有因此消失。你在异乡开门时，先让孩子说自己的名字，再问他们愿意学什么。' },
  ordinary: { title: '人间有处', text: '大劫之后，你选了一种不那么传奇的余生。屋里有饭、窗外有药，曾经被供奉册压住的人，可以自己决定明年。' },
  sacrifice: { title: '山河无恙', text: '你把这一生留在最后一道门前，明确地知道自己不会归来。被接走的人没有把你只写成境界与战绩，他们在新屋里留下了你的名字。' },
  fallen: { title: '一盏未归灯', text: '你把胜负押在一人的剑上，没能走出主门。早已备好的退路仍接住了同行者，程照雪在松林边留下一盏灯。这次失败是这局人生的结尾。' },
  old_age: { title: '未走完的路', text: '寿元走到了尽头，你还有没来得及寄出的信。那些做过的选择并未归零，活下来的人继续走你留下的路。' },
};
