/// <reference path="qargs.ts" />

module testbench {
    // "editor" is the initial state; from there it can go to
    // either of the three states and cannot go back
    type Mode = 'editor' | 'proof-tree' | 'solver' | 'debugger';

    type Tool = 'SQ' | 'MA' | 'AB' | 'AW' | 'XX';

    export const vm = new class VM {
        sgfchanged = new Event<() => void>();
        resized = new Event<() => void>();

        constructor() {
            $(() => {
                $('#sgf').focusout(() => {
                    this.sgfchanged.fire();
                });

                document.addEventListener('keydown', event => {
                    const key = event.key.toUpperCase();
                    const tool = $('button[data-key=' + key + ']').attr('data-value') as Tool;

                    if (tool)
                        vm.tool = tool;
                });

                document.addEventListener('keyup', event => {
                    const key = event.key.toUpperCase();
                    const tool = $('button[data-key=' + key + ']').attr('data-value');

                    if (tool == vm.tool)
                        vm.tool = null;
                });

                $('#download').click(() => {
                    const name = location.hash.slice(1).replace(/[^\w]/g, '-') || 'file';
                    const blob = new Blob([vm.sgf], { type: 'application/x-go-sgf' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = name + '.sgf';
                    a.click();
                });

                window.addEventListener('resize', event => {
                    vm.resized.fire();
                });

                window.addEventListener('paste', (event: any) => {
                    console.log('inspecting clipboard...');
                    for (const item of event.clipboardData.items) {
                        console.log(item);
            
                        if (!item.type.startsWith('image/')) {
                            console.log('skipping the item because it\'s not an image');
                            continue;
                        }
            
                        const blob = item.getAsFile();
                        const source = URL.createObjectURL(blob);
            
                        const image = document.createElement('img');
                        image.src = source;
            
                        image.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx2d = canvas.getContext('2d');
            
                            console.log('got image: ' + image.width + ' x ' + image.height);
                            canvas.width = image.width;
                            canvas.height = image.height;
                            ctx2d.drawImage(image, 0, 0);
            
                            console.log('detecting circles...');
                            const idata = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
                            const sgf = parseimg(idata.data, [idata.width, idata.height]);
            
                            console.log('got sgf: ' + sgf);
                            const board = new tsumego.Board(sgf);
                            console.log('size = ' + board.size);
                            console.log(board.text);
                        };
                    }
                });                
            });
        }

        get width() {
            return window.innerWidth;
        }

        get height() {
            return window.innerHeight;
        }

        set isVertical(value: boolean) {
            if (value)
                $('#grid').addClass('vertical');
            else
                $('#grid').removeClass('vertical');
        }

        set mode(value: Mode) {
            document.body.className = value;
        }

        get mode(): Mode {
            return document.body.className as Mode;
        }

        /** The currently selected editor tool: MA, AB, AW, etc. */
        get tool(): Tool {
            const button = document.querySelector('#tool button.active');
            return (button && button.getAttribute('data-value')) as Tool;
        }

        set tool(value: Tool) {
            for (const button of $('#tool button').toArray()) {
                if (button.getAttribute('data-value') == value)
                    button.classList.add('active');
                else
                    button.classList.remove('active');
            }
        }

        /** ko master: +1, -1 or 0 */
        get km(): number {
            const b = document.querySelector('#km button.active');
            return b ? +b.getAttribute('data-value') : undefined;
        }

        set km(value: number) {
            for (const button of $('#km button').toArray()) {
                if (+button.getAttribute('data-value') == value)
                    button.classList.add('active');
                else
                    button.classList.remove('active');
            }
        }

        /** Hides/shows the km selector. */
        set kmVisible(viisble: boolean) {
            $('#km').css('display', viisble ? '' : 'none');
        }

        /** e.g. "B3 bc" */
        set coords(text: string) {
            $('#coords').text(text);
        }

        set note(text: string) {
            console.log(text);
            $('#comment').text(text);
        }

        get sgf(): string {
            return $('#sgf').text();
        }

        set sgf(text: string) {
            $('#sgf').text(text);
        }

        set svg(text: string) {
            // better to reformat the entire xml, but this works too
            text = text.replace(/(<\/\w+>)(<\w+)/gm, '$1\n  $2');

            $('#svg').text(text);
        }

        set canUndo(value: boolean) {
            if (value)
                $('#undo').removeClass('disabled');
            else
                $('#undo').addClass('disabled');
        }

        dbg = new class DbgVM {
            set inactive(value: boolean) {
                $('#dbg-panel button').toggleClass('disabled', value);
            }

            /** aka F5 */
            get run() {
                return $('#dbg-run');
            }

            get bp() {
                return $('#dbg-bp');
            }

            /** aka F11 */
            get stepInto() {
                return $('#dbg-into');
            }

            /** aka F10 */
            get stepOver() {
                return $('#dbg-next');
            }

            /** aka Shift+F11 */
            get stepOut() {
                return $('#dbg-undo');
            }

            get stop() {
                return $('#dbg-stop');
            }
        };
    };
}
