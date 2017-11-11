$(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    (canvas as any).style = 'border: 1px solid green';
    document.body.appendChild(canvas);

    window.addEventListener('paste', (event: any) => {
        console.log('inspecting clipboard...');
        for (const item of event.clipboardData.items) {
            console.log(item);
            const blob = item.getAsFile();
            const source = URL.createObjectURL(blob);

            const image = document.createElement('img');
            image.src = source;

            image.onload = () => {
                console.log(image.width + ' x ' + image.height);
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.drawImage(image, 0, 0);
            };
        }
    });
});
