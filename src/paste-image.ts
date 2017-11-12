module testbench {
    // Detects balck and white stones on the image.
    // Returns SGF with SZ, AB and AW properties.
    //
    // shape(rgba) = [w, h, 4] of 0..255
    export function parseimg(rgba, [w, h]) {
        console.log('grayscaling...');
        const gs = new Float32Array(w * h);
        grayscale(gs, rgba, [w, h]);
        normalize(gs, [w, h]);

        console.log('detecting intersections...');
        const [x0, y0, ds] = intersections(gs, [w, h]);
        console.log('top left intersection: x = ' + x0 + ', y = ' + y0);
        console.log('circle diameter: ' + ds);

        console.log('detecting circles...');

        const b_max = 0.25;
        const w_min = 0.80;

        const b_stones = [];
        const w_stones = [];

        let xn_max = 0;
        let yn_max = 0;
        let xn_min = Infinity;
        let yn_min = Infinity;

        console.log('b_max = ' + b_max);
        console.log('w_min = ' + w_min);

        for (let y = y0 % ds; y < h; y += ds) {
            let s1 = [], s2 = [];
            for (let x = x0 % ds; x < w; x += ds) {
                let a = average(gs, [w, h], [x, y], ds / 2 | 0);
                let q = iscount(gs, [w, h], [x, y], 2);

                s1.push(a.toFixed(2).slice(2));
                s2.push(q);

                let xn = (x - x0 % ds) / ds | 0;
                let yn = (y - y0 % ds) / ds | 0;

                if (a < b_max)
                    b_stones.push([xn, yn]);

                if (a > w_min)
                    w_stones.push([xn, yn]);

                if (a < b_max || a > w_min || q > 2) {
                    xn_max = Math.max(xn_max, xn);
                    yn_max = Math.max(yn_max, yn);
                    xn_min = Math.min(xn_min, xn);
                    yn_min = Math.min(yn_min, yn);
                }

            }

            console.log(s1.join(' ') + '    ' + s2.join(' '));
        }

        console.log('x range', [xn_min, xn_max]);
        console.log('y range', [yn_min, yn_max]);

        const sz = Math.max(xn_max - xn_min, yn_max - yn_min) + 1;

        const ns = i => String.fromCharCode(0x61 + i);
        const nss = list => list.map(q => '[' + q.map(ns).join('') + ']').join('');

        const sgf = '(;FF[4]'
            + 'SZ[' + sz + ']'
            + 'AB' + nss(b_stones)
            + 'AW' + nss(w_stones)
            + ')';

        console.log('writing data back to image...');
        printimg(gs, [w, h]);

        return sgf;
    }

    function printimg(gs, [w, h]) {
        const canvas = document.createElement('canvas');

        canvas.width = w;
        canvas.height = h;

        const ctx2d = canvas.getContext('2d');
        const idata = ctx2d.getImageData(0, 0, w, h);

        colorize(idata.data, gs, [w, h]);
        ctx2d.putImageData(idata, 0, 0);

        const url = canvas.toDataURL();
        console.log('%c       ', `font-size: ${h}px; background: url(${url}) no-repeat;`);
    }

    function minmax(data, [w, h]) {
        let min = 1 / 0, max = -1 / 0;

        for (let i = 0; i < w * h; i++) {
            max = Math.max(max, data[i]);
            min = Math.min(min, data[i]);
        }

        return [min, max];
    }

    function apply(data, [w, h], fn: (x) => number) {
        for (let i = 0, n = w * h; i < n; i++)
            data[i] = fn(data[i]);
    }

    function normalize(image, [w, h]) {
        const [min, max] = minmax(image, [w, h]);
        apply(image, [w, h], x => (x - min) / (max - min));
    }

    // The alpha channel is ignored.
    //
    // shape(result) = [w, h] of [0..1]
    // shape(rgba) = [w, h, 4] of [0..255]
    function grayscale(result, rgba, [w, h]) {
        for (let i = 0, n = w * h * 4; i < n; i += 4) {
            let r = rgba[i + 0];
            let g = rgba[i + 1];
            let b = rgba[i + 2];
            let a = rgba[i + 3];

            result[i >> 2] = (r + g + b) / 3 / 255;
        }
    }

    // The alpha channel is set to 255.
    //
    // shape(rgba) = [w, h, 4] of [0..255]
    // shape(input) = [w, h] of [0..1]
    function colorize(rgba, input, [w, h]) {
        for (let i = 0, n = w * h * 4; i < n; i += 4) {
            let s = input[i >> 2] * 255 | 0;

            rgba[i + 0] = s;
            rgba[i + 1] = s;
            rgba[i + 2] = s;
            rgba[i + 3] = 255;
        }
    }

    // Returns:
    //
    //  4 = intersection in the middle
    //  3 = intersection on a side
    //
    // shape(image) = [w, h] of [0..1]
    function iscount(image, [w, h], [x, y], n) {
        let q1 = 0, q2 = 0, q3 = 0, q4 = 0;

        for (let d = 0; d < n; d++) {
            q1 += image[x - d + y * w];
            q2 += image[x + d + y * w];
            q3 += image[x + (y - d) * w];
            q4 += image[x + (y + d) * w];
        }

        return (+!q1) + (+!q2) + (+!q3) + (+!q4);
    }

    // Detects simple intersections of black color.
    //
    // shape(image) = [w, h] of [0..1]
    // returns [x, y, step]
    function intersections(image, [w, h], n = 2, md = 10) {
        const xs = [], ys = [];

        for (let y = n; y < h - n; y++) {
            for (let x = n; x < w - n; x++) {
                let qn = iscount(image, [w, h], [x, y], n);

                if (qn > 2) {
                    xs.push(x);
                    ys.push(y);
                }
            }
        }

        console.log('x ', xs.sort((a, b) => a - b));
        console.log('y ', ys.sort((a, b) => a - b));

        const diffs = [];

        for (let i = 1; i < xs.length; i++) {
            let dx = xs[i] - xs[i - 1];
            if (dx >= md)
                diffs.push(dx);
        }

        for (let i = 1; i < ys.length; i++) {
            let dy = ys[i] - ys[i - 1];
            if (dy >= md)
                diffs.push(dy);
        }

        let step = Math.min(...diffs);
        let xmin = Math.min(...xs);
        let ymin = Math.min(...ys);

        return [xmin, ymin, step];
    }

    // Finds the average value within radius r.
    //
    // shape(image) = [w, h] of [0..1]
    function average(image, [w, h], [x, y], r) {
        let sum = 0, n = 0;

        for (let dx = -r; dx <= r; dx++)
            for (let dy = -r; dy <= r; dy++)
                if (0 <= x + dx && x + dx < w && 0 <= y + dy && y + dy < h)
                    if (dx * dx + dy * dy <= r * r)
                        sum += image[x + dx + (y + dy) * w], n++;

        return sum / n;
    }
}
