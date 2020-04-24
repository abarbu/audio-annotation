function generate(name,offset,segmentSize,onlyImages,maxOffset)

if nargin < 4
    onlyImages = 0
end
if nargin < 3
    error('Not enough arguments')
end

ainfo = audioinfo(['movies/' name '/' name '.wav'])
fs = ainfo.SampleRate
samples = ainfo.TotalSamples
samples/fs/60
load spec_cmap;
total = offset:segmentSize/2:(samples/fs);
h = figure; set(h, 'Visible','off');
for s = offset:segmentSize/2:(samples/fs)
    if maxOffset > 0 & s > maxOffset
        break
    end
    round(s/segmentSize)
    size(total)
    try
        [y,fs]=audioread(['movies/' name '/' name '.wav'], [(s*fs)+1 (s+segmentSize)*fs+1]);
        startStr = sprintf('%05d', s);
        endStr = sprintf('%05d', (s+segmentSize));
        fileprefix = [name ':' startStr ':' endStr]
        if ~onlyImages
            audiowrite(['public/audio-clips/' fileprefix '.wav']'',y,fs)
        end
        [S,F,T] = spectrogram(y(:,1),hann(1024),768,2000,fs);
        im = imagesc(T,-F,log(abs(S)),[-5,10]);
        colormap(mycmap);
        shading interp;
        axis off;
    catch err
        err
    end
    set(gca,'position',[0 0 1 1],'units','normalized', 'Visible', 'off');
    saveas(im, ['public/spectrograms/' fileprefix], 'png');
    print(gcf,'-djpeg','-r280', ['public/spectrograms/' fileprefix]);
    system(['mogrify  -crop 1200x565+0+335 public/spectrograms/' fileprefix '.png']);
    system(['mogrify  -crop 2800x900+0+850 public/spectrograms/' fileprefix '.jpg']);
    if ~onlyImages
        system(['ffmpeg -y -i file:' ['public/audio-clips/' fileprefix] '.wav -filter:a "atempo=0.5" -vn file:' ['public/audio-clips/' fileprefix] '-0.5.wav']);
    end
end
