function generate(name,offset,segmentSize,onlyImages)

if nargin < 4
    onlyImages = 0
end
if nargin < 3
    error('Not enough arguments')
end

[r fs] = wavread(['../' name '/' name '.wav'], 'size')
samples = r(1)
samples/fs/60
h = figure('Visible','off');
load spec_cmap;
total = offset:segmentSize:(samples/fs);
for s = offset:segmentSize:(samples/fs)
    round(s/segmentSize)
    size(total)
    try
        [y,fs,nbits]=wavread(['../' name '/' name '.wav'], [(s*fs)+1 (s+segmentSize)*fs+1]);
        startStr = sprintf('%05d', s);
        endStr = sprintf('%05d', (s+segmentSize));
        fileprefix = [name ':' startStr ':' endStr]
        if ~onlyImages
            wavwrite(y,fs,nbits,[fileprefix '.wav']'')
        end
        [S,F,T] = spectrogram(y(:,1),hann(1024),768,2000,fs);
        im = imagesc(T,-F,log(abs(S)),[-5,10]);
        colormap(mycmap);
        shading interp;
        axis off;
    catch err
        err
    end
    set(gca,'position',[0 0 1 1],'units','normalized');
    saveas(im, fileprefix, 'png');
    print(gcf,'-djpeg','-r280', fileprefix);
    system(['mogrify  -crop 1200x565+0+335 ' fileprefix '.png']);
    system(['mogrify  -crop 2800x900+0+850 ' fileprefix '.jpg']);
    if ~onlyImages
        system(['ffmpeg -i file:' fileprefix '.wav -filter:a "atempo=0.5" -vn file:' fileprefix '-0.5.wav']);
    end
end
